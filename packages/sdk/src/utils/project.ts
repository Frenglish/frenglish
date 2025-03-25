import { apiRequest } from "./api";

/**
 * Retrieves the public API key associated with a project based on its domain; this is for website integration only.
 *
 * @param domain - The domain URL of the project.
 * @returns {Promise<string>} A promise that resolves to a public API key string (e.g. 'pk_live_123...')
 * @throws If the request fails or the domain is not associated with any project.
 */
export async function getPublicAPIKeyFromDomain(apiKey: string, domain: string): Promise<string> {
  return apiRequest<string>('/api/project/get-public-api-key-from-domain', {
    apiKey,
    body: { domainURL: domain },
    errorContext: 'Failed to get public API key from domain',
  });
}

/**
 * Retrieves the domain associated with the current Frenglish project; this is for website integration only.
 *
 * @returns {Promise<string>} A promise that resolves to the project's domain URL (e.g. 'https://example.com')
 * @throws If the request fails or the API responds with an error.
 */
export async function getProjectDomain(apiKey: string): Promise<string> {
  return apiRequest<string>('/api/project/get-domain-url', {
    apiKey,
    errorContext: 'Failed to get project domain',
  });
}