import { Configuration } from '@frenglish/utils';
import { apiRequest } from './api';

/**
 * Retrieves the default translation configuration for the current project.
 *
 * @returns {Promise<Configuration>} A promise that resolves to a Configuration object containing:
 *   - id: The configuration ID
 *   - originLanguage: The source language code (e.g. 'en')
 *   - languages: Array of target language codes (e.g. ['fr', 'es'])
 *   - projectID: The associated project ID
 * @throws If the request fails or the API responds with an error.
 */
export async function getDefaultConfiguration(apiKey: string): Promise<Configuration> {
  return apiRequest<Configuration>('/api/configuration/get-default-configuration', {
    apiKey,
    errorContext: 'Failed to get default configuration',
  });
}

/**
 * Retrieves the list of supported languages for the project along with the origin language.
 *
 * @returns {Promise<{ languages: string[], originLanguage: string }>} A promise that resolves to an object containing:
 *   - languages: Array of supported language codes (e.g. ['en', 'fr', 'es'])
 *   - originLanguage: The project's source language code (e.g. 'en')
 * @throws If the request fails or the API responds with an error.
 */
export async function getProjectSupportedLanguages(apiKey: string): Promise<{ languages: string[]; originLanguage: string }> {
  return apiRequest<{ languages: string[]; originLanguage: string }>('/api/configuration/get-project-supported-languages', {
    apiKey,
    errorContext: 'Failed to get project supported languages',
  });
}
