const TOKEN_KEY = 'miniboard_access_token'

interface SuccessResponse<T> {
  success: true
  data: T
}

interface ErrorResponse {
  success: false
  error: { code: string; message: string; details?: unknown }
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message)
  }
}

export function readToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function saveToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = readToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`/api${path}`, { ...init, headers })
  const payload = (await response.json()) as SuccessResponse<T> | ErrorResponse
  if (!response.ok || !payload.success) {
    const error = (payload as ErrorResponse).error
    throw new ApiError(error.code, error.message, response.status, error.details)
  }
  return payload.data
}

