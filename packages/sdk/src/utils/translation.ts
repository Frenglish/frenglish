import {
  RequestTranslationResponse,
  TranslationResponse,
  TranslationStatus,
  PartialConfiguration,
  parsePartialConfig,
  FileContentWithLanguage,
  CompletedTranslationResponse,
} from '@frenglish/utils';
import { apiRequest } from './api';

/**
 * Submits content for translation and polls until the translation is ready.
 *
 * @param {string[]} content - The content to translate.
 * @param {boolean} [isFullTranslation=false] - Whether to perform a full translation.
 * @param {string[]} [filenames=[]] - Filenames associated with the content.
 * @param {PartialConfiguration} [partialConfig={}] - Partial configuration to override default settings.
 * @returns {Promise<CompletedTranslationResponse | undefined>} A promise that resolves to:
 *   - RequestTranslationResponse with translationId and content if successful
 *   - undefined if polling times out after 30 minutes
 * @throws If the request fails or the translation is cancelled.
 */
export async function translate(
  content: string[],
  isFullTranslation = false,
  filenames: string[] = [],
  partialConfig: PartialConfiguration = {},
): Promise<CompletedTranslationResponse | undefined> {
  const POLLING_INTERVAL = 500;
  const MAX_POLLING_TIME = 1800000;
  const startTime = Date.now() - POLLING_INTERVAL;
  const parsedConfig = await parsePartialConfig(partialConfig);

  const data = await apiRequest<RequestTranslationResponse>('/api/translation/request-translation', {
    body: { content, isFullTranslation, filenames, partialConfig: parsedConfig },
    errorContext: 'Failed to request translation',
  });

  while (Date.now() - startTime < MAX_POLLING_TIME) {
    const translationStatus = await getTranslationStatus(data.translationId);
    if (translationStatus === TranslationStatus.COMPLETED) {
      const translationContent = await getTranslationContent(data.translationId);
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
 * @param {string} content - The string content to translate.
 * @param {string} lang - The target language code.
 * @param {PartialConfiguration} [partialConfig={}] - Optional overrides to the default configuration.
 * @returns {Promise<string | undefined>} A promise that resolves to:
 *   - The translated string if successful
 *   - undefined if polling times out after 30 minutes
 * @throws If the translation is cancelled, the language is unsupported, or the request fails.
 */
export async function translateString(
  content: string, 
  lang: string, 
  partialConfig: PartialConfiguration = {}
): Promise<string | undefined> {
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
    body: { content, lang, partialConfig: parsedConfig },
    errorContext: 'Failed to request translation string',
  });

  while (Date.now() - startTime < MAX_POLLING_TIME) {
    const translationStatus = await getTranslationStatus(data.translationId);
    if (translationStatus === TranslationStatus.COMPLETED) {
      const content = await getTranslationContent(data.translationId);
      const translatedContent = content[0]?.files[0]?.content;
      if (translatedContent) {
        const parsedContent = JSON.parse(translatedContent as string);
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
 * @param {number} translationId - The unique ID of the translation request.
 * @returns {Promise<TranslationStatus>} A promise that resolves to the current translation status (e.g. 'COMPLETED', 'CANCELLED', 'IN_PROGRESS')
 * @throws If the request fails.
 */
export async function getTranslationStatus(translationId: number): Promise<TranslationStatus> {
  const data = await apiRequest<{ status: TranslationStatus }>('/api/translation/get-status', {
    body: { translationId },
    errorContext: 'Failed to get translation status',
  });
  return data.status;
}

/**
 * Fetches the translated content once the translation is complete.
 *
 * @param {number} translationId - The unique ID of the translation request.
 * @returns {Promise<TranslationResponse[]>} A promise that resolves to an array of translation responses, each containing:
 *   - language: The target language code
 *   - files: Array of translated file contents
 * @throws If the request fails.
 */
export async function getTranslationContent(translationId: number): Promise<TranslationResponse[]> {
  return apiRequest<TranslationResponse[]>('/api/translation/get-translation', {
    body: { translationId },
    errorContext: 'Failed to get translation content',
  });
}

/**
 * Fetches the project's current text map for translation tracking. This will contain all the translations for your project.
 * The text map keeps the translations consistent, so if you use the same sentences, it will not translate them again and will return the same result.
 *
 * @returns {Promise<{ content: string } | null>} A promise that resolves to:
 *   - An object containing the text map content if it exists
 *   - null if no text map exists
 * @throws If the request fails.
 */
export async function getTextMap(): Promise<{ content: string } | null> {
  return apiRequest<{ content: string } | null>('/api/project/request-text-map', {
    errorContext: 'Failed to fetch project text map',
  });
}

/**
 * Retrieves the list of languages supported by the Frenglish translation service.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of supported language codes (e.g. ['en', 'fr', 'es'])
 * @throws If the request fails or the API responds with an error.
 */
export async function getSupportedLanguages(): Promise<string[]> {
  return apiRequest<string[]>('/api/translation/supported-languages', {
    errorContext: 'Failed to get supported languages',
  });
}

/**
 * Retrieves the list of file types supported for translation uploads.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of supported file extensions (e.g. ['.txt', '.json', '.md'])
 * @throws If the request fails or the API responds with an error.
 */
export async function getSupportedFileTypes(): Promise<string[]> {
  return apiRequest<string[]>('/api/translation/supported-file-types', {
    errorContext: 'Failed to get supported file types',
  });
}

/**
 * Uploads one or more files for translation, typically used as base files to compare against.
 *
 * @param {FileContentWithLanguage[]} files - An array of files with language metadata and content.
 * @returns {Promise<{ message: string, originFilesInfo: Array<{ fileId: string, originS3Version: string }> }>} A promise that resolves to:
 *   - message: Success message
 *   - originFilesInfo: Array of uploaded file information
 * @throws If the upload fails or the API responds with an error.
 */
export async function upload(files: FileContentWithLanguage[]): Promise<{ message: string, originFilesInfo: Array<{ fileId: string, originS3Version: string }> }> {
  return apiRequest('/api/translation/upload-files', {
    body: { files },
    errorContext: 'Failed to upload files',
  });
}

