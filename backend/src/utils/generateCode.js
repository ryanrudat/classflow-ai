/**
 * Generates a random 8-character join code for sessions
 * Uses only uppercase letters and numbers, avoiding confusing characters
 * (no O/0, I/1, etc.)
 */
export function generateJoinCode() {
  // Characters that are easy to read and type
  // Excluded: 0, O, 1, I, L to avoid confusion
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return code
}

/**
 * Validates a join code format
 */
export function isValidJoinCode(code) {
  if (!code || typeof code !== 'string') return false
  if (code.length !== 8) return false

  // Only allow characters from our allowed set
  const validChars = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/
  return validChars.test(code)
}
