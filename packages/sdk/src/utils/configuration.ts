import { Configuration } from '@frenglish/utils';
import { apiRequest } from './api';

/**
 * Retrieves the default translation configuration for the current project.
 *
 * @param apiKey - The API key used for authentication.
 * @returns A `Configuration` object containing the project's default settings.
 * @throws If the request fails or the API responds with an error.
 */
export async function getDefaultConfiguration(apiKey: string): Promise<Configuration> {
  return apiRequest<Configuration>('/api/configuration/get-default-configuration', {
    apiKey,
    body: { apiKey },
    errorContext: 'Failed to get default configuration',
  });
}

/**
 * Retrieves the list of supported languages for the project along with the origin language.
 *
 * @param apiKey - The API key used for authentication.
 * @returns An object containing the list of `languages` and the `originLanguage`.
 * @throws If the request fails or the API responds with an error.
 */
export async function getProjectSupportedLanguages(apiKey: string): Promise<{ languages: string[]; originLanguage: string }> {
  return apiRequest<{ languages: string[]; originLanguage: string }>('/api/configuration/get-project-supported-languages', {
    apiKey,
    body: { apiKey },
    errorContext: 'Failed to get project supported languages',
  });
}
