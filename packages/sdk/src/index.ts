// src/index.ts
import { PartialConfiguration, Configuration, FlatJSON, Project, FileContentWithLanguage, TranslationResponse, TranslationStatus, Invitation, TextAndStyleMapResponse, LangResolveDecision, UrlMapPerLanguage } from '@frenglish/utils'
import {
  translate as translateUtil,
  translateString as translateStringUtil,
  getTranslationStatus as getTranslationStatusUtil,
  getTranslationContent as getTranslationContentUtil,
  getTextAndStyleMap as getTextAndStyleMapUtil,
  getTextMap as getTextMapUtil,
  getTranslatedFile as getTranslatedFileUtil,
  getSupportedFileTypes as getSupportedFileTypesUtil,
  getSupportedLanguages as getSupportedLanguagesUtil,
  getOutdatedFiles as getOutdatedFilesUtil,
  getRedirectPath as getRedirectPathUtil
} from './utils/translation.js'
import {
  getDefaultConfiguration as getDefaultConfigurationUtil,
  getProjectSupportedLanguages as getProjectSupportedLanguagesUtil,
} from './utils/configuration.js'
import {
  getProjectDomain as getProjectDomainUtil,
  getProjectUrlMap as getProjectUrlMapUtil,
  getPublicAPIKeyFromDomain as getPublicAPIKeyFromDomainUtil,
  getUserProjects as getUserProjectsUtil,
  createProject as createProjectUtil,
  updateConfiguration as updateConfigurationUtil,
  sendProjectInvitation as sendProjectInvitationUtil,
  setProjectActiveStatus as setProjectActiveStatusUtil,
  getProjectInformation as getProjectInformationUtil,
  updateProjectName as updateProjectNameUtil,
  setTestMode as setTestModeUtil,
  saveGlossaryEntries as saveGlossaryEntriesUtil,
  getGlossaryEntries as getGlossaryEntriesUtil,
  modifyGlossaryEntries as modifyGlossaryEntriesUtil,
  deleteGlossaryEntries as deleteGlossaryEntriesUtil
} from './utils/project.js'

/**
 * Gets all projects that the user has access to, including projects from all teams they are part of.
 * This function requires an access token from the login flow, not an API key.
 *
 * @param accessToken - The JWT access token from the login flow
 * @param auth0Id - The Auth0 ID of the user
 * @param email - The email of the user
 * @param name - The name of the user
 * @returns {Promise<{projects: any[], teams: any[]}>} A promise that resolves to an object containing:
 *   - projects: Array of all projects the user has access to
 *   - teams: Array of all teams the user is part of
 * @throws {Error} If the request fails or the API responds with an error.
 */
export const getUserProjects = getUserProjectsUtil

/**
 * Creates a new project.
 *
 * @param accessToken - The JWT access token from the login flow
 * @param auth0Id - The Auth0 ID of the user
 * @param teamID - The ID of the team to create the project in
 * @returns {Promise<Project>} A promise that resolves to the created project
 * @throws {Error} If the request fails or the API responds with an error.
 */
export const createProject = createProjectUtil

// Export types
export type {
  PartialConfiguration,
  Configuration,
  FlatJSON,
  Project,
  FileContentWithLanguage,
  TranslationResponse,
  TranslationStatus
}

/**
 * Interface defining all methods available in the Frenglish SDK.
 * This interface provides type safety and documentation for all SDK methods.
 */
export interface FrenglishSDK {
  /**
   * Translates an array of content strings with optional configuration.
   * This method will poll for the translation result until it's complete or cancelled.
   *
   * @param content - Array of content strings to translate
   * @param isFullTranslation - Whether to perform a full translation or partial (the default is set to false so that we would reuse the existing translation)
   * @param filenames - Optional array of filenames corresponding to content
   * @param partialConfig - Optional configuration overrides
   * @param paths - Optional path specification of urls
   * @param {Object} [opts={}] - Additional options for the translation request.
   * @param {boolean} [opts.wait=true] - When true (default), wait and poll until the translation completes
   *   and return the translated content. When false, fire-and-forget: queue the translation and return
   *   immediately with an empty `content` array.
   * @returns Translation ID and content if successful
   * @throws {Error} If translation is cancelled or request fails
   *
   * @example
   * const result = await sdk.translate(
   *   ['Translate this for my json file', 'Translate this for my html file'],
   *   true,
   *   ['hello.json', 'welcome.html']
   * );
   */
  translate(content: string[], isFullTranslation?: boolean, filenames?: string[], partialConfig?: PartialConfiguration, paths?: string[], opts?: { wait?: boolean }): Promise<{ translationId: number, content: TranslationResponse[] }>;

  /**
   * Translates a single string to a specified target language.
   * Includes validation of supported languages and polling for results.
   *
   * @param content - The string or array of strings content to translate
   * @param lang - Target language code (use getSupportedLanguages() to get valid codes)
   * @param isFullTranslation - Whether to perform a full translation or partial (the default is set to false so that we would reuse the existing translation)
   * @param partialConfig - Optional configuration overrides
   * @returns Translated string if successful, undefined if not found
   * @throws {Error} If language is not supported, translation is cancelled, or request fails
   *
   * @example
   * const translated = await sdk.translateString('Hello world', 'fr');
   */
  translateString(content: string | string[], lang: string, isFullTranslation?: boolean, partialConfig?: PartialConfiguration): Promise<string | string[] | undefined>;

  /**
   * Gets the current status of a translation request.
   *
   * @param translationId - ID of the translation to check
   * @returns Current status of the translation
   * @throws {Error} If the status check fails
   *
   * @example
   * const status = await sdk.getTranslationStatus(12345);
   */
  getTranslationStatus(translationId: number): Promise<TranslationStatus>;

  /**
   * Retrieves the content of a completed translation.
   *
   * @param translationId - ID of the translation to retrieve
   * @returns Array of translation responses
   * @throws {Error} If content retrieval fails
   */
  getTranslationContent(translationId: number): Promise<TranslationResponse[]>;

   /**
   * Retrieves the project's text map and style map, which contains mappings of text content.
   *
   * @returns Text map and style mapcontent if exists, null otherwise
   * @throws {Error} If text map retrieval fails
   */
  getTextAndStyleMap(requestedLang?: string, hashesOrOpts?: string[] | { hashes?: string[]; baseUrl?: string }): Promise<{ content: TextAndStyleMapResponse } | null>;

  /**
   * Retrieves the project's text map, which contains mappings of text content.
   *
   * @returns Text map content if exists, null otherwise
   * @throws {Error} If text map retrieval fails
   */
  getTextMap(requestedLang?: string): Promise<{ content: FlatJSON[] } | null>;

  /**
   * Retrieves the translated file content for a specified language.
   *
   * @returns Translated string or content if exists, null otherwise
   * @throws {Error} If text map retrieval fails
   */
  getTranslatedFile(requestedLang: string, content: string | Buffer, fileId: string): Promise<string | Buffer>;

  /**
   * Retrieves the default configuration settings for translations.
   *
   * @returns Default configuration object
   * @throws {Error} If configuration retrieval fails
   */
  getDefaultConfiguration(): Promise<Configuration>;

  /**
   * Gets the list of languages supported by the project and the origin language.
   *
   * @returns Object containing supported languages and origin language
   * @throws {Error} If language information retrieval fails
   */
  getProjectSupportedLanguages(): Promise<{ languages: string[], originLanguage: string }>;

  /**
   * Gets the domain URL associated with the current project.
   *
   * @returns Project's domain URL
   * @throws {Error} If domain retrieval fails
   */
  getProjectDomain(): Promise<string>;

  /**
   * Retrieves the URL map for a specified language in the project.
   *
   * @param language - Target language code for the URL map
   * @returns URL map object for the specified language
   * @throws {Error} If URL map retrieval fails
   */
  getProjectUrlMap(language: string): Promise<UrlMapPerLanguage>;

  /**
   * Retrieves the public API key associated with a given domain.
   *
   * @param domainURL - Domain URL to get the API key for
   * @returns Public API key for the domain
   * @throws {Error} If API key retrieval fails
   */
  getPublicAPIKeyFromDomain(domainURL: string): Promise<string>;

  /**
   * Gets a list of file types supported for translation.
   *
   * @returns Array of supported file extensions
   * @throws {Error} If file type information retrieval fails
   */
  getSupportedFileTypes(): Promise<string[]>;

  /**
   * Gets a list of languages supported for translation.
   *
   * @returns Array of supported language codes
   * @throws {Error} If supported languages retrieval fails
   */
  getSupportedLanguages(): Promise<string[]>;

  /**
   * Retrieves the list of outdated files for a given project.
   *
   * @param apiKey - The API key for authentication.
   * @returns {Promise<TranslationResponse[]>} A promise that resolves to an array of translation responses.
   * @throws If the request fails or the API responds with an error.
   */
  getOutdatedFiles(): Promise<TranslationResponse[]>;

  /**
   * Given a target language and path (e.g. "/de/about-us"), ask the backend
   * if the page is allowed or if we should redirect elsewhere.
   *
   * @param targetLang - e.g. "de"
   * @param targetPath - e.g. "/de/about-us" (NOT a full URL)
   * @param options.performRedirect - If true, will call window.location.assign(...)
   * @param options.baseUrl - Optional absolute base (e.g. "https://example.com") to prefix finalUrl
   * @returns Backend decision plus a computed finalUrl (or null if no nav needed)
   *
   * @example
   * const { finalUrl } = await sdk.getRedirectPath('fr', '/fr/about-us', { performRedirect: true })
   */
  getRedirectPath(
    targetLang: string,
    targetPath: string,
    options?: { performRedirect?: boolean; baseUrl?: string }
  ): Promise<LangResolveDecision & { finalUrl: string | null }>;

  /**
   * Updates the configuration for a project.
   *
   * @param partiallyUpdatedConfig - The configuration updates to apply
   * @returns The updated configuration
   * @throws {Error} If the request fails or the API responds with an error
   */
  updateConfiguration(partiallyUpdatedConfig: PartialConfiguration): Promise<Configuration>;

  /**
   * Send invitation to a project for the onboarding process
   *
   * @returns {Promise<Invitation>} A promise that resolves to the invitation data
   * @throws {Error} If the request fails or the API responds with an error
   */
  sendProjectInvitation(): Promise<Invitation>;

  /**
   * Toggles the active status of a project.
   *
   * @param isActive - The new active status of the project
   * @returns The updated project
   * @throws {Error} If the request fails or the API responds with an error
   */
  setProjectActiveStatus(isActive: boolean): Promise<Project>;

  /**
   * Retrieves information about the current project.
   *
   * @returns The current project
   * @throws {Error} If the request fails or the API responds with an error
   */
  getProjectInformation(): Promise<Project>;

  /**
   * Updates the current project name.
   *
   * @param updatedProjectName - The updated project name
   * @returns The updated project
   * @throws {Error} If the request fails or the API responds with an error
   */
  updateProjectName(updatedProjectName: string): Promise<Project>;

  /**
   * Toggles the test mode of a project.
   *
   * @param isTestMode - The new test mode status of the project
   * @returns The updated project
   * @throws {Error} If the request fails or the API responds with an error
   */
  setTestMode(isTestMode: boolean): Promise<Project>;

  /**
   * Saves glossary entries for a project.
   *
   * @param entries - Array of glossary entries to save
   * @returns {Promise<{ success: boolean }>} A promise that resolves to success status
   * @throws {Error} If the request fails or the API responds with an error
   */
  saveGlossaryEntries(entries: any[]): Promise<{ success: boolean }>;

  /**
   * Get glossary entries for a project.
   *
   * @param entries - Array of glossary entries to save
   * @returns {Promise<TranslationResponse>} A promise that resolves to success status
   * @throws {Error} If the request fails or the API responds with an error
   */
  getGlossaryEntries(): Promise<TranslationResponse>;

  /**
   * Modifies glossary entries for a project.
   *
   * @param entries - Array of glossary entries to modify
   * @returns {Promise<{ success: boolean }>} A promise that resolves to success status
   * @throws {Error} If the request fails or the API responds with an error
   */
  modifyGlossaryEntries(entries: any[]): Promise<{ success: boolean }>;

  /**
   * Deletes glossary entries for a project.
   *
   * @param entries - Array of glossary entries to delete
   * @param language - Optional language code for the entries to delete
   * @returns {Promise<any>} A promise that resolves to the deletion result
   * @throws {Error} If the request fails or the API responds with an error
   */
  deleteGlossaryEntries(entries: string[], language?: string): Promise<any>;
}

/**
 * Creates a Frenglish SDK instance for handling translations and configuration.
 * This is the main entry point for interacting with the Frenglish translation service.
 *
 * @param apiKey - The API key for authentication with the Frenglish service
 * @returns An instance of the Frenglish SDK with all available methods
 */
export function FrenglishSDK(apiKey: string): FrenglishSDK {
  return {
    translate: async (content, isFullTranslation = false, filenames = [], partialConfig = {}, paths = [], opts: {}) => {
      return translateUtil(content, apiKey, isFullTranslation, filenames, partialConfig, paths, opts)
    },

    translateString: async (content, lang, isFullTranslation, partialConfig = {}) => {
      return translateStringUtil(content, lang, isFullTranslation, apiKey, partialConfig)
    },

    getTranslationStatus: async (translationId) => {
      return getTranslationStatusUtil(translationId, apiKey)
    },

    getTranslationContent: async (translationId) => {
      return getTranslationContentUtil(translationId, apiKey)
    },

    getTextMap: async (requestedLang) => {
      return getTextMapUtil(apiKey, requestedLang)
    },

    getTranslatedFile: async (requestedLang, content, fileId) => {
      return getTranslatedFileUtil(apiKey, requestedLang, content, fileId)
    },

    getTextAndStyleMap: async (requestedLang, hashesOrOpts) => {
      return getTextAndStyleMapUtil(apiKey, requestedLang, hashesOrOpts)
    },

    getDefaultConfiguration: async () => {
      return getDefaultConfigurationUtil(apiKey)
    },

    getOutdatedFiles: async () => {
      return getOutdatedFilesUtil(apiKey)
    },

    getRedirectPath: async (targetLang, targetPath, options = {}) => {
      return getRedirectPathUtil({
        apiKey,
        targetLang,
        targetPath,
        ...options, // { performRedirect?, baseUrl? }
      })
    },

    getProjectSupportedLanguages: async () => {
      return getProjectSupportedLanguagesUtil(apiKey)
    },

    getProjectDomain: async () => {
      return getProjectDomainUtil(apiKey)
    },

    getProjectUrlMap: async (language) => {
      return getProjectUrlMapUtil(apiKey, language)
    },

    getPublicAPIKeyFromDomain: async (domainURL) => {
      return getPublicAPIKeyFromDomainUtil(apiKey, domainURL)
    },

    getSupportedFileTypes: async () => {
      return getSupportedFileTypesUtil()
    },

    getSupportedLanguages: async () => {
      return getSupportedLanguagesUtil()
    },

    updateConfiguration: async (partiallyUpdatedConfig) => {
      return updateConfigurationUtil(apiKey, partiallyUpdatedConfig)
    },

    sendProjectInvitation: async () => {
      return sendProjectInvitationUtil(apiKey)
    },

    setProjectActiveStatus: async (isActive) => {
      return setProjectActiveStatusUtil(apiKey, isActive)
    },

    getProjectInformation: async () => {
      return getProjectInformationUtil(apiKey)
    },

    updateProjectName: async (updatedProjectName) => {
      return updateProjectNameUtil(apiKey, updatedProjectName)
    },

    setTestMode: async (isTestMode) => {
      return setTestModeUtil(apiKey, isTestMode)
    },

    saveGlossaryEntries: async (entries) => {
      return saveGlossaryEntriesUtil(apiKey, entries)
    },

    getGlossaryEntries: async () => {
      return getGlossaryEntriesUtil(apiKey)
    },

    modifyGlossaryEntries: async (entries) => {
      return modifyGlossaryEntriesUtil(apiKey, entries)
    },

    deleteGlossaryEntries: async (entries, language) => {
      return deleteGlossaryEntriesUtil(apiKey, entries, language)
    }
  }
}

// Export as default for backward compatibility
export default FrenglishSDK
