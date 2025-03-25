import { FRENGLISH_BACKEND_URL } from '@frenglish/utils';

export async function apiRequest<T>(
  endpoint: string,
  options?: {
    apiKey?: string;
    body?: any;
    errorContext?: string;
  }
): Promise<T> {
  const { apiKey, body, errorContext } = options || {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${FRENGLISH_BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const prefix = errorContext ? `${errorContext}: ` : 'API Error: ';
    throw new Error(`${prefix}[${response.status}] ${errorText}`);
  }

  return response.json();
}
