const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion

/** Generate a 4-character room code */
export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}
