const TOKEN_KEY = 'imbursare_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export interface TokenPayload {
  sub: string
  email: string
  companyId?: string
  role?: string
}

export function parseToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload)) as TokenPayload
  } catch {
    return null
  }
}
