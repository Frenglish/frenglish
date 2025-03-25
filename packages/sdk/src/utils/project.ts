import { apiRequest } from "./api";

/**
 * Retrieves the public API key associated with a project based on its domain; this is for website integration only.
 *
 * @param domain - The domain URL of the project.
 * @param apiKey - The authenticated private API key.
 * @returns A public API key string associated with the domain.
 * @throws If the request fails or the domain is not associated with any project.
 */
export async function getPublicAPIKeyFromDomain(domain: string, apiKey: string) {
    return apiRequest<string>('/api/project/get-public-api-key-from-domain', {
      body: { domainURL: domain, apiKey },
      errorContext: 'Failed to get public API key from domain',
    });
  }
  
  /**
   * Retrieves the domain associated with the current Frenglish project; this is for website integration only.
   *
   * @param apiKey - The API key used for authentication.
   * @returns The domain URL as a string.
   * @throws If the request fails or the API responds with an error.
   */
  export async function getProjectDomain(apiKey: string): Promise<string> {
    return apiRequest<string>('/api/project/get-domain-url', {
      apiKey,
      body: { apiKey },
      errorContext: 'Failed to get project domain',
    });
  }