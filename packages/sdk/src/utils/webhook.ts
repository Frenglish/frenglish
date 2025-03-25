import { apiRequest } from "./api";

/**
 * Registers a webhook URL for the current project. The webhook will be triggered by Frenglish events.
 *
 * @param apiKey - The API key used for authentication.
 * @param webhookUrl - The URL to receive webhook callbacks.
 * @throws If the registration fails or the API responds with an error.
 */
export async function registerWebhook(apiKey: string, webhookUrl: string): Promise<void> {
    await apiRequest<void>('/api/webhook/register-webhook', {
      apiKey,
      body: { webhookUrl, apiKey },
      errorContext: 'Failed to register webhook',
    });
  }