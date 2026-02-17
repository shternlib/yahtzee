const SESSION_KEY = 'yahtzee_session_id'
const NAME_KEY = 'yahtzee_player_name'

export function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SESSION_KEY)
}

export function storeSessionId(sessionId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_KEY, sessionId)
}

export function getStoredPlayerName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(NAME_KEY)
}

export function storePlayerName(name: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(NAME_KEY, name)
}
