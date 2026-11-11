// 6 characters, ambiguous ones (0/O, 1/I) removed.
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  return Array.from(array).map((b) => chars[b % chars.length]).join('')
}
