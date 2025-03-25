import {
  RequestTranslationResponse,
  TranslationResponse,
  TranslationStatus,
  PartialConfiguration,
  parsePartialConfig,
  FileContentWithLanguage,
} from '@frenglish/utils';
import { apiRequest } from './api';

/**
 * Submits content for translation and polls until the translation is ready.
 *
 * @param apiKey - The API key for authentication.
 * @param content - The content to translate.
 * @param isFullTranslation - Whether to perform a full translation (default: false).
 * @param filenames - [Optional] filenames associated with the content.
 * @param partialConfig - [Optional] partial configuration to override default settings.
 * @returns The completed translation response, or undefined if polling timed out.
 * @throws If the request fails or the translation is cancelled.
 */
export async function translate(
  apiKey: string,
  content: string[],
  isFullTranslation = false,
  filenames: string[] = [],
  partialConfig: PartialConfiguration = {},
): Promise<RequestTranslationResponse | undefined> {
  const POLLING_INTERVAL = 500;
  const MAX_POLLING_TIME = 1800000;
  const startTime = Date.now() - POLLING_INTERVAL;
  const parsedConfig = await parsePartialConfig(partialConfig);

  const data = await apiRequest<RequestTranslationResponse>('/api/translation/request-translation', {
    apiKey,
    body: { content, apiKey, isFullTranslation, filenames, partialConfig: parsedConfig },
    errorContext: 'Failed to request translation',
  });

  while (Date.now() - startTime < MAX_POLLING_TIME) {
    const translationStatus = await getTranslationStatus(apiKey, data.translationId);
    if (translationStatus === TranslationStatus.COMPLETED) {
      const translationContent = await getTranslationContent(apiKey, data.translationId);
      return { translationId: data.translationId, content: translationContent };
    } else if (translationStatus === TranslationStatus.CANCELLED) {
      throw new Error('Translation cancelled');
    }

    await new Promise(res => setTimeout(res, POLLING_INTERVAL));
  }
}

/**
 * Translates a single string and returns the translated result.
 *
 * @param apiKey - The API key for authentication.
 * @param content - The string content to translate.
 * @param lang - The target language code.
 * @param partialConfig - Optional overrides to the default configuration.
 * @returns The translated string.
 * @throws If the translation is cancelled, the language is unsupported, or the request fails.
 */
export async function translateString(apiKey: string, content: string, lang: string, partialConfig: PartialConfiguration = {}): Promise<string | undefined> {
  const POLLING_INTERVAL = 500;
  const MAX_POLLING_TIME = 1800000;
  const startTime = Date.now() - POLLING_INTERVAL;
  const parsedConfig = await parsePartialConfig(partialConfig);

  const supportedLanguages = await apiRequest<string[]>('/api/translation/supported-languages', {
    errorContext: 'Failed to get supported languages',
  });

  if (!supportedLanguages.includes(lang)) {
    throw new Error(`Language '${lang}' is not supported. Supported languages are: ${supportedLanguages.join(', ')}`);
  }

  const data = await apiRequest<RequestTranslationResponse>('/api/translation/request-translation-string', {
    apiKey,
    body: { content, apiKey, lang, partialConfig: parsedConfig },
    errorContext: 'Failed to request translation string',
  });

  while (Date.now() - startTime < MAX_POLLING_TIME) {
    const translationStatus = await getTranslationStatus(apiKey, data.translationId);
    if (translationStatus === TranslationStatus.COMPLETED) {
      const content = await getTranslationContent(apiKey, data.translationId);
      const translatedContent = content[0]?.files[0]?.content;
      if (translatedContent) {
        const parsedContent = JSON.parse(translatedContent);
        return Object.values(parsedContent)[0] as string;
      }
      return undefined;
    } else if (translationStatus === TranslationStatus.CANCELLED) {
      throw new Error('Translation cancelled');
    }

    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
  }
}

/**
 * Retrieves the current status of a submitted translation request.
 *
 * @param apiKey - The API key for authentication.
 * @param translationId - The unique ID of the translation request.
 * @returns The current translation status.
 * @throws If the request fails.
 */
export async function getTranslationStatus(apiKey: string, translationId: number): Promise<TranslationStatus> {
  const data = await apiRequest<{ status: TranslationStatus }>('/api/translation/get-status', {
    apiKey,
    body: { translationId, apiKey },
    errorContext: 'Failed to get translation status',
  });
  return data.status;
}

/**
 * Fetches the translated content once the translation is complete.
 *
 * @param apiKey - The API key for authentication.
 * @param translationId - The unique ID of the translation request.
 * @returns An array of translation responses.
 * @throws If the request fails.
 */
export async function getTranslationContent(apiKey: string, translationId: number): Promise<TranslationResponse[]> {
  return apiRequest<TranslationResponse[]>('/api/translation/get-translation', {
    apiKey,
    body: { translationId, apiKey },
    errorContext: 'Failed to get translation content',
  });
}

/**
 * Fetches the project's current text map for translation tracking. This will contain all the translations for your project.
 * The text map keeps the translations consistent, so if you use the same sentences, it will not translate them again and will return the same result.
 *
 * @param apiKey - The API key for authentication.
 * @returns A `File` object containing the text map or `null` if none exists.
 * @throws If the request fails.
 */
export async function getTextMap(apiKey: string): Promise<File | null> {
  return apiRequest<File | null>('/api/project/request-text-map', {
    apiKey,
    body: { apiKey },
    errorContext: 'Failed to fetch project text map',
  });
}

/**
 * Retrieves the list of languages supported by the Frenglish translation service.
 *
 * @param apiKey - The API key used for authentication.
 * @returns An array of supported language codes.
 * @throws If the request fails or the API responds with an error.
 */
export async function getSupportedLanguages(apiKey: string) {
  return apiRequest<string[]>('/api/translation/supported-languages', {
    body: { apiKey },
    errorContext: 'Failed to get supported languages',
  });
}

/**
 * Retrieves the list of file types supported for translation uploads.
 *
 * @returns An array of supported file type extensions or MIME types.
 * @throws If the request fails or the API responds with an error.
 */
export async function getSupportedFileTypes() {
  return apiRequest<string[]>('/api/translation/supported-file-types', {
    errorContext: 'Failed to get supported file types',
  });
}

/**
 * Uploads one or more files for translation, typically used as base files to compare against.
 *
 * @param apiKey - The API key used for authentication.
 * @param files - An array of files with language metadata and content.
 * @returns The API response from the upload endpoint.
 * @throws If the upload fails or the API responds with an error.
 */
export async function upload(apiKey: string, files: FileContentWithLanguage[]) {
  return apiRequest('/api/translation/upload-files', {
    apiKey,
    body: { files, apiKey },
    errorContext: 'Failed to upload files',
  });
}

