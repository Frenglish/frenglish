import { apiRequest } from "./api";

/**
 * Registers a webhook URL for the current project. The webhook will be triggered by Frenglish events.
 *
 * @param webhookUrl - The URL to receive webhook callbacks.
 * @throws If the registration fails or the API responds with an error.
 */
export async function registerWebhook(webhookUrl: string): Promise<void> {
  await apiRequest<void>('/api/webhook/register-webhook', {
    body: { webhookUrl },
    errorContext: 'Failed to register webhook',
  });
}