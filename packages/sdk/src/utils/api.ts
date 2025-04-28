import { FRENGLISH_BACKEND_URL } from '@frenglish/utils'

export async function apiRequest<T>(
  endpoint: string,
  options?: {
    apiKey?: string;
    accessToken?: string;
    body?: any;
    errorContext?: string;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const { apiKey, accessToken, body, errorContext, headers: customHeaders } = options || {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  } else if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${FRENGLISH_BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const responseText = await response.text()

  if (!response.ok) {
    const prefix = errorContext ? `${errorContext}: ` : 'API Error: '
    throw new Error(`${prefix}[${response.status}] ${responseText}`)
  }

  try {
    const parsedResponse = JSON.parse(responseText)
    return parsedResponse as T
  } catch (error) {
    console.error("Failed to parse response:", error)
    throw new Error(`Failed to parse response: ${responseText}`)
  }
}
