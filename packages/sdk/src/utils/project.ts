import { apiRequest } from "./api.js"
import { Configuration, PartialConfiguration, Project, ProjectResponse, TranslationResponse } from "@frenglish/utils"
/**
 * Retrieves the public API key associated with a project based on its domain; this is for website integration only.
 *
 * @param apiKey - The API key of the project
 * @param domain - The domain URL of the project.
 * @returns {Promise<string>} A promise that resolves to a public API key string (e.g. 'pk_live_123...')
 * @throws If the request fails or the domain is not associated with any project.
 */
export async function getPublicAPIKeyFromDomain(apiKey: string, domain: string): Promise<string> {
  return apiRequest<string>('/api/project/get-public-api-key-from-domain', {
    body: {
      domainURL: domain,
      apiKey,
    },
    errorContext: 'Failed to get public API key from domain',
  })
}

/**
 * Retrieves the domain associated with the current Frenglish project; this is for website integration only.
 *
 * @param apiKey - The API key of the project
 * @returns {Promise<string>} A promise that resolves to the project's domain URL (e.g. 'https://example.com')
 * @throws If the request fails or the API responds with an error.
 */
export async function getProjectDomain(apiKey: string): Promise<string> {
  return apiRequest<string>('/api/project/get-domain-url', {
    body: {
      apiKey,
    },
    errorContext: 'Failed to get project domain',
  })
}

/**
 * Retrieves all projects that the user has access to, including projects from all teams they are part of.
 *
 * @param accessToken - The JWT access token from the login flow
 * @param auth0Id - The Auth0 ID of the user
 * @returns {Promise<{projects: any[], teams: any[]}>} A promise that resolves to an object containing:
 *   - projects: Array of all projects the user has access to
 *   - teams: Array of all teams the user is part of
 * @throws If the request fails or the API responds with an error.
 */
export async function getUserProjects(accessToken: string, auth0Id: string, email: string, name: string): Promise<{projects: any[], teams: any[]}> {
  return apiRequest<{projects: any[], teams: any[]}>('/api/user/user-projects', {
    accessToken,
    body: {
      auth0Id,
      email,
      name,
    },
    errorContext: 'Failed to get user projects',
  })
}

/**
 * Creates a new project.
 *
 * @param accessToken - The JWT access token from the login flow
 * @param auth0Id - The Auth0 ID of the user
 * @param teamID - The ID of the team to create the project in
 * @returns {Promise<ProjectResponse>} A promise that resolves to the created project
 * @throws If the request fails or the API responds with an error.
 */
export async function createProject(accessToken: string, auth0Id: string, teamID: number): Promise<ProjectResponse> {
  return apiRequest<ProjectResponse>('/api/project/create-project', {
    accessToken,
    body: {
      teamID: teamID,
      auth0Id: auth0Id,
      projectType: "cli_sdk",
    },
    errorContext: 'Failed to create project',
  })
}

/**
 * Update configuration.
 *
 * @param apiKey - The API key of the project
 * @param config - The configuration to update
 * @returns {Promise<Configuration>} A promise that resolves to the updated configuration
 * @throws If the request fails or the API responds with an error.
 */
export async function updateConfiguration(apiKey: string, config: PartialConfiguration): Promise<Configuration> {
  return apiRequest<Configuration>('/api/configuration/update-translation-config', {
    body: {
      apiKey,
      partiallyUpdatedConfig: config,
    },
    errorContext: 'Failed to update configuration',
  })
}

/**
 * Update project.
 *
 * @param apiKey - The API key of the project
 * @param isActive - The new active status of the project
 * @returns {Promise<Project>} A promise that resolves to the updated project
 * @throws If the request fails or the API responds with an error.
 */
export async function setProjectActiveStatus(apiKey: string, isActive: boolean): Promise<Project> {
  return apiRequest<Project>('/api/project/toggle-active', {
    body: {
      apiKey,
      isActive,
    },
    errorContext: 'Failed to set active status',
  })
}

/**
 * Retrieves the list of supported languages for the project along with the origin language.
 *
 * @returns {Promise<Project>} A promise that resolves to a Project object containing:
 *   - id: The project ID
 *   - name: The project name
 *   - domain: The project domain
 * @throws If the request fails or the API responds with an error.
 */
export async function getProjectInformation(apiKey: string): Promise<Project> {
  return apiRequest<Project>('/api/project/get-project', {
    body: {
      apiKey,
    },
    errorContext: 'Failed to get project information',
  })
}

/**
 * Updates the name of the current project.
 *
 * @param apiKey - The API key of the project
 * @param updatedProjectName - The updated project name
 * @returns {Promise<Project>} A promise that resolves to the updated project
 * @throws If the request fails or the API responds with an error.
 */
export async function updateProjectName(apiKey: string, updatedProjectName: string): Promise<Project> {
  return apiRequest<Project>('/api/project/rename', {
    body: {
      apiKey,
      projectName: updatedProjectName,
    },
    errorContext: 'Failed to update project name',
  })
}

/**
 * Toggles the test mode of a project.
 *
 * @param apiKey - The API key of the project
 * @param isTestMode - The new test mode status of the project
 * @returns {Promise<Project>} A promise that resolves to the updated project
 * @throws If the request fails or the API responds with an error.
 */
export async function setTestMode(apiKey: string, isTestMode: boolean): Promise<Project> {
  return apiRequest<Project>('/api/project/toggle-test-mode', {
    body: {
      apiKey,
      isTestMode,
    },
    errorContext: 'Failed to set test mode',
  })
}

/**
 * Saves glossary entries to the project.
 *
 * @param apiKey - The API key for authentication
 * @param entries - Glossary entries to save
 * @returns A promise that resolves to a success status
 * @throws {Error} If the request fails or the API responds with an error
 */
export async function saveGlossaryEntries(apiKey: string, entries: TranslationResponse[]): Promise<{ success: boolean }> {
  const response = await apiRequest<{ success: boolean }>('/api/project/save-project-glossary', {
    body: {
      apiKey,
      entries
    }
  })

  return response
}

/**
 * Modifies existing glossary entries for the project.
 *
 * @param apiKey - The API key for authentication
 * @param entries - Array of modified glossary entries with oldKey, newKey, oldValue, and newValue
 * @returns A promise that resolves to a success status
 * @throws {Error} If the request fails or the API responds with an error
 */
export async function modifyGlossaryEntries(
  apiKey: string,
  entries: Array<{oldKey: string, newKey: string, oldValue: string, newValue: string}>
): Promise<{ success: boolean }> {
  // The API expects entries as a string in a specific format
  const formattedEntries = [{
    files: [{
      content: JSON.stringify(entries)
    }]
  }]

  const response = await apiRequest<{ success: boolean }>('/api/project/modify-project-glossary-entries', {
    body: {
      apiKey,
      entries: formattedEntries
    }
  })

  return response
}

/**
 * Deletes glossary entries from the project.
 *
 * @param apiKey - The API key for authentication
 * @param entries - Array of glossary entries to delete
 * @param language - Optional language to filter deletions
 * @returns A promise that resolves to the result of the deletion
 * @throws {Error} If the request fails or the API responds with an error
 */
export async function deleteGlossaryEntries(
  apiKey: string,
  entries: string[],
  language?: string
): Promise<{ success: boolean }> {
  const response = await apiRequest<{ success: boolean }>('/api/project/delete-project-glossary-entries', {
    body: {
      apiKey,
      entries,
      language
    }
  })

  return response
}
