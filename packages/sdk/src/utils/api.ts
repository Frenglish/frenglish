import { FRENGLISH_BACKEND_URL } from '@frenglish/utils'

type HttpMethod = 'GET' | 'POST'

export async function apiRequest<T>(
  endpoint: string,
  options?: {
    method?: HttpMethod;              // default: 'POST'
    apiKey?: string;                  // public or private API key
    accessToken?: string;             // JWT (still supported)
    body?: any;                       // ignored for GET
    errorContext?: string;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const {
    method = 'POST',
    apiKey,
    accessToken,
    body,
    errorContext,
    headers: customHeaders,
  } = options || {}

  const hasBody = method !== 'GET' && body !== undefined

  const headers: Record<string, string> = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...customHeaders,
  }

  // Your server's authorize() checks public/private API keys in:
  //   req.headers['x-api-key']  OR  req.body.apiKey
  // So we must send x-api-key for both GET and POST.
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  // If an accessToken is present, send it in Authorization.
  // If there's no accessToken but there is an apiKey, we ALSO keep sending
  // Authorization: Bearer <apiKey> for old endpoints that relied on it.
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  } else if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(`${FRENGLISH_BACKEND_URL}${endpoint}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : undefined,
  })

  const responseText = await response.text()

  if (!response.ok) {
    const prefix = errorContext ? `${errorContext}: ` : 'API Error: '
    throw new Error(`${prefix}[${response.status}] ${responseText}`)
  }

  if (!responseText) return undefined as unknown as T
  try {
    return JSON.parse(responseText) as T
  } catch {
    throw new Error(`Failed to parse response: ${responseText}`)
  }
}
