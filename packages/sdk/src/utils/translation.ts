import {
  RequestTranslationResponse,
  TranslationResponse,
  TranslationStatus,
  PartialConfiguration,
  parsePartialConfig,
  FileContentWithLanguage,
  CompletedTranslationResponse,
  FlatJSON,
} from '@frenglish/utils'
import { apiRequest } from './api'

/**
 * Internal helper function to poll for translation completion.
 *
 * @param {number} translationId - ID of the translation to poll for
 * @param {string} apiKey - API key for authentication
 * @param {number} [pollingInterval=500] - Interval between polls in milliseconds
 * @param {number} [maxPollingTime=1800000] - Maximum time to poll in milliseconds
 * @returns {Promise<TranslationResponse[]>} Array of translation responses
 * @throws {Error} If translation is cancelled or polling times out
 */
export const pollForTranslation = async (
  translationId: number,
  apiKey: string,
  pollingInterval: number = 500,
  maxPollingTime: number = 1800000
): Promise<TranslationResponse[]> => {
  const startTime = Date.now() - pollingInterval

  while (Date.now() - startTime < maxPollingTime) {
    const translationStatus = await apiRequest<{ status: TranslationStatus }>('/api/translation/get-status', {
      apiKey,
      body: { translationId },
      errorContext: 'Failed to get translation status',
    }).then(data => data.status)

    if (translationStatus === TranslationStatus.COMPLETED) {
      return apiRequest<TranslationResponse[]>('/api/translation/get-translation', {
        apiKey,
        body: { translationId },
        errorContext: 'Failed to get translation content',
      })
    } else if (translationStatus === TranslationStatus.CANCELLED) {
      throw new Error('Translation cancelled')
    }

    await new Promise(resolve => setTimeout(resolve, pollingInterval))
  }
  throw new Error('Translation polling timed out')
}

/**
 * Submits content for translation and polls until the translation is ready.
 *
 * @param {string[]} content - The content to translate.
 * @param {string} apiKey - API key for authentication
 * @param {boolean} [isFullTranslation=false] - Whether to perform a full translation.
 * @param {string[]} [filenames=[]] - Filenames associated with the content.
 * @param {PartialConfiguration} [partialConfig={}] - Partial configuration to override default settings.
 * @returns {Promise<CompletedTranslationResponse>} A promise that resolves to RequestTranslationResponse with translationId and content
 * @throws {Error} If the request fails, translation is cancelled, or polling times out
 */
export async function translate(
  content: string[],
  apiKey: string,
  isFullTranslation = false,
  filenames: string[] = [],
  partialConfig: PartialConfiguration = {},
): Promise<CompletedTranslationResponse> {
  const parsedConfig = await parsePartialConfig(partialConfig)

  const data = await apiRequest<RequestTranslationResponse>('/api/translation/request-translation', {
    apiKey,
    body: { content, isFullTranslation, filenames, partialConfig: parsedConfig },
    errorContext: 'Failed to request translation',
  })

  const translationContent = await pollForTranslation(data.translationId, apiKey)
  return { translationId: data.translationId, content: translationContent }
}

/**
 * Translates a single string and returns the translated result.
 *
 * @param {string} content - The string content to translate.
 * @param {string} lang - The target language code.
 * @param {string} apiKey - API key for authentication
 * @param {PartialConfiguration} [partialConfig={}] - Optional overrides to the default configuration.
 * @returns {Promise<string | undefined>} A promise that resolves to:
 *   - The translated string if successful
 *   - undefined if the translation result is not in expected format
 * @throws {Error} If the translation is cancelled, the language is unsupported, polling times out, or the request fails.
 */
export async function translateString(
  content: string,
  lang: string,
  apiKey: string,
  partialConfig: PartialConfiguration = {}
): Promise<string | undefined> {
  const parsedConfig = await parsePartialConfig(partialConfig)

  const supportedLanguages = await apiRequest<string[]>('/api/translation/supported-languages', {
    errorContext: 'Failed to get supported languages',
  })

  if (!supportedLanguages.includes(lang)) {
    throw new Error(`Language '${lang}' is not supported. Supported languages are: ${supportedLanguages.join(', ')}`)
  }

  const data = await apiRequest<RequestTranslationResponse>('/api/translation/request-translation-string', {
    apiKey,
    body: { content, lang, partialConfig: parsedConfig },
    errorContext: 'Failed to request translation string',
  })

  const translationContent = await pollForTranslation(data.translationId, apiKey)
  const translatedContent = translationContent[0]?.files[0]?.content
  if (translatedContent) {
    const parsedContent = JSON.parse(translatedContent as string)
    return Object.values(parsedContent)[0] as string
  }
  return undefined
}

/**
 * Retrieves the current status of a submitted translation request.
 *
 * @param {number} translationId - The unique ID of the translation request.
 * @returns {Promise<TranslationStatus>} A promise that resolves to the current translation status (e.g. 'COMPLETED', 'CANCELLED', 'IN_PROGRESS')
 * @throws If the request fails.
 */
export async function getTranslationStatus(translationId: number, apiKey: string): Promise<TranslationStatus> {
  const data = await apiRequest<{ status: TranslationStatus }>('/api/translation/get-status', {
    apiKey,
    body: { translationId },
    errorContext: 'Failed to get translation status',
  })
  return data.status
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
export async function getTranslationContent(translationId: number, apiKey: string): Promise<TranslationResponse[]> {
  return apiRequest<TranslationResponse[]>('/api/translation/get-translation', {
    apiKey,
    body: { translationId },
    errorContext: 'Failed to get translation content',
  })
}

/**
 * Fetches the project's current text map for translation tracking. This will contain all the translations for your project.
 * The text map keeps the translations consistent, so if you use the same sentences, it will not translate them again and will return the same result.
 *
 * @returns {Promise<{ content: FlatJSON[] } | null>} A promise that resolves to:
 *   - An object containing the text map content if it exists
 *   - null if no text map exists
 * @throws If the request fails.
 */
export async function getTextMap(apiKey: string): Promise<{ content: FlatJSON[] } | null> {
  return apiRequest<{ content: FlatJSON[] } | null>('/api/project/request-text-map', {
    apiKey,
    errorContext: 'Failed to fetch project text map',
  })
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
  })
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
  })
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
export async function upload(files: FileContentWithLanguage[], apiKey: string): Promise<{ message: string, originFilesInfo: Array<{ fileId: string, originS3Version: string }> }> {
  return apiRequest('/api/translation/upload-files', {
    apiKey,
    body: { files },
    errorContext: 'Failed to upload files',
  })
}
