/**
 * Client-side session helpers.
 * User CRUD is now handled server-side via /api/auth/* routes.
 */

const SESSION_KEY = 'bidzone-session-user-id'
const LEGACY_AUTH_KEY = 'bidzone-auth'

export function getSessionUserId(): string | null {
  try {
    const id = localStorage.getItem(SESSION_KEY)
    return id && id.length > 0 ? id : null
  } catch {
    return null
  }
}

export function setSessionUserId(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function clearLegacyAuthFlag() {
  try {
    localStorage.removeItem(LEGACY_AUTH_KEY)
  } catch {
    /* ignore */
  }
}

export function hasLegacyAuthOnly(): boolean {
  try {
    return localStorage.getItem(LEGACY_AUTH_KEY) === '1'
  } catch {
    return false
  }
}
