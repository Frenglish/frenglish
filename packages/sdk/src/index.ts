// src/index.ts
import { PartialConfiguration, Configuration, FlatJSON, Project, FileContentWithLanguage, TranslationResponse, TranslationStatus } from '@frenglish/utils'
import {
  translate as translateUtil,
  translateString as translateStringUtil,
  getTranslationStatus as getTranslationStatusUtil,
  getTranslationContent as getTranslationContentUtil,
  getTextMap as getTextMapUtil,
  getSupportedFileTypes as getSupportedFileTypesUtil,
  getSupportedLanguages as getSupportedLanguagesUtil,
  upload as uploadUtil
} from './utils/translation.js'
import {
  getDefaultConfiguration as getDefaultConfigurationUtil,
  getProjectSupportedLanguages as getProjectSupportedLanguagesUtil,
} from './utils/configuration.js'
import {
  getProjectDomain as getProjectDomainUtil,
  getPublicAPIKeyFromDomain as getPublicAPIKeyFromDomainUtil,
  getUserProjects as getUserProjectsUtil,
  createProject as createProjectUtil,
  updateConfiguration as updateConfigurationUtil
} from './utils/project.js'

/**
 * Gets all projects that the user has access to, including projects from all teams they are part of.
 * This function requires an access token from the login flow, not an API key.
 *
 * @param accessToken - The JWT access token from the login flow
 * @param auth0Id - The Auth0 ID of the user
 * @returns {Promise<{projects: any[], teams: any[]}>} A promise that resolves to an object containing:
 *   - projects: Array of all projects the user has access to
 *   - teams: Array of all teams the user is part of
 * @throws {Error} If the request fails or the API responds with an error.
 */
export const getUserProjects = getUserProjectsUtil;

    /**
     * Creates a new project.
     *
     * @param accessToken - The JWT access token from the login flow
     * @param auth0Id - The Auth0 ID of the user
     * @param teamID - The ID of the team to create the project in
     * @returns {Promise<Project>} A promise that resolves to the created project
     * @throws {Error} If the request fails or the API responds with an error.
     */
export const createProject = createProjectUtil;

/**
 * Creates a Frenglish SDK instance for handling translations and configuration.
 * This is the main entry point for interacting with the Frenglish translation service.
 *
 * @param {string} apiKey - The API key for authentication with the Frenglish service
 * @returns {FrenglishSDK} An instance of the Frenglish SDK with all available methods
 */
export const FrenglishSDK = (apiKey: string) => {
  return {
    /**
     * Translates an array of content strings with optional configuration.
     * This method will poll for the translation result until it's complete or cancelled.
     *
     * @param {string[]} content - Array of content strings to translate
     * @param {boolean} [isFullTranslation=false] - Whether to perform a full translation or partial (the default is set to false so that we would reuse the existing translation)
     * @param {string[]} [filenames=[]] - Optional array of filenames corresponding to content
     * @param {PartialConfiguration} [partialConfig={}] - Optional configuration overrides
     * @returns {Promise<{ translationId: number, content: TranslationResponse[] }>}
     *          Translation ID and content if successful
     * @throws {Error} If translation is cancelled or request fails
     *
     * @example
     * const result = await sdk.translate(
     *   ['Translate this for my json file', 'Translate this for my html file'],
     *   true,
     *   ['hello.json', 'welcome.html']
     * );
     */
    translate: async (
      content: string[],
      isFullTranslation: boolean = false,
      filenames: string[] = [],
      partialConfig: PartialConfiguration = {}
    ): Promise<{ translationId: number, content: TranslationResponse[] }> => {
      return translateUtil(content, apiKey, isFullTranslation, filenames, partialConfig)
    },

    /**
     * Translates a single string to a specified target language.
     * Includes validation of supported languages and polling for results.
     *
     * @param {string} content - The string content to translate
     * @param {string} lang - Target language code (use getSupportedLanguages() to get valid codes)
     * @param {PartialConfiguration} [partialConfig={}] - Optional configuration overrides
     * @returns {Promise<string | undefined>} Translated string if successful, undefined if not found
     * @throws {Error} If language is not supported, translation is cancelled, or request fails
     *
     * @example
     * const translated = await sdk.translateString('Hello world', 'fr');
     */
    translateString: async (
      content: string,
      lang: string,
      partialConfig: PartialConfiguration = {}
    ): Promise<string | undefined> => {
      return translateStringUtil(content, lang, apiKey, partialConfig)
    },

    /**
     * Gets the current status of a translation request.
     *
     * @param {number} translationId - ID of the translation to check
     * @returns {Promise<TranslationStatus>} Current status of the translation
     * @throws {Error} If the status check fails
     *
     * @example
     * const status = await sdk.getTranslationStatus(12345);
     */
    getTranslationStatus: async (translationId: number): Promise<TranslationStatus> => {
      return getTranslationStatusUtil(translationId, apiKey)
    },

    /**
     * Retrieves the content of a completed translation.
     *
     * @param {number} translationId - ID of the translation to retrieve
     * @returns {Promise<TranslationResponse[]>} Array of translation responses
     * @throws {Error} If content retrieval fails
     */
    getTranslationContent: async (translationId: number): Promise<TranslationResponse[]> => {
      return getTranslationContentUtil(translationId, apiKey)
    },

    /**
     * Retrieves the project's text map, which contains mappings of text content.
     *
     * @returns {Promise<{ content: FlatJSON[] } | null>} Text map content if exists, null otherwise
     * @throws {Error} If text map retrieval fails
     */
    getTextMap: async (): Promise<{ content: FlatJSON[] } | null> => {
      return getTextMapUtil(apiKey)
    },

    /**
     * Retrieves the default configuration settings for translations.
     *
     * @returns {Promise<Configuration>} Default configuration object [{"id": "1234567890", "originLanguage": "en", "languages": ["fr", "es"]}]
     * @throws {Error} If configuration retrieval fails
     */
    getDefaultConfiguration: async (): Promise<Configuration> => {
      return getDefaultConfigurationUtil(apiKey)
    },

    /**
     * Gets the list of languages supported by the project and the origin language.
     *
     * @returns {Promise<{ languages: string[], originLanguage: string }>}
     *          Object containing supported languages and origin language [{"languages": ["en", "fr", "es"], "originLanguage": "en"}]
     * @throws {Error} If language information retrieval fails
     */
    getProjectSupportedLanguages: async (): Promise<{ languages: string[], originLanguage: string }> => {
      return getProjectSupportedLanguagesUtil(apiKey)
    },

    /**
     * Gets the domain URL associated with the current project.
     *
     * @returns {Promise<string>} Project's domain URL [https://example.com]
     * @throws {Error} If domain retrieval fails
     */
    getProjectDomain: async (): Promise<string> => {
      return getProjectDomainUtil(apiKey)
    },

    /**
     * Retrieves the public API key associated with a given domain.
     *
     * @param {string} domainURL - Domain URL to get the API key for [https://example.com]
     * @returns {Promise<string>} Public API key for the domain
     * @throws {Error} If API key retrieval fails
     */
    getPublicAPIKeyFromDomain: async (domainURL: string): Promise<string> => {
      return getPublicAPIKeyFromDomainUtil(apiKey, domainURL)
    },

    /**
     * Gets a list of file types supported for translation.
     *
     * @returns {Promise<string[]>} Array of supported file extensions [.txt, .json, .md, ...]
     * @throws {Error} If file type information retrieval fails
     */
    getSupportedFileTypes: async (): Promise<string[]> => {
      return getSupportedFileTypesUtil()
    },

    /**
     * Gets a list of languages supported for translation.
     *
     * @returns {Promise<string[]>} Array of supported language codes [en, fr, es, ...]
     * @throws {Error} If supported languages retrieval fails
     */
    getSupportedLanguages: async (): Promise<string[]> => {
      return getSupportedLanguagesUtil()
    },

    /**
     * Uploads files for translation with their associated language information.
     *
     * @param {FileContentWithLanguage[]} files - Array of file contents with language metadata [{"content": "Hello world", "language": "en"}]
     * @returns {Promise<{ message: string, originFilesInfo: Array<{ fileId: string, originS3Version: string }> }>}
     *          Upload confirmation and file information
     * @throws {Error} If file upload fails
     */
    upload: async (files: FileContentWithLanguage[]): Promise<{ message: string, originFilesInfo: Array<{ fileId: string, originS3Version: string }> }> => {
      return uploadUtil(files, apiKey)
    },

    /**
     * Updates the configuration for a project.
     *
     * @returns {Promise<Configuration>} A promise that resolves to the updated configuration
     * @throws {Error} If the request fails or the API responds with an error.
     */
    updateConfiguration: async (partiallyUpdatedConfig: PartialConfiguration): Promise<Configuration> => {
      return updateConfigurationUtil(apiKey, partiallyUpdatedConfig)
    }
  }
}

// Export the type
export type FrenglishSDK = ReturnType<typeof FrenglishSDK>;

// Export a default function that creates the SDK
export default FrenglishSDK;
