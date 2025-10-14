// T031: Invitation token helpers
// Security implementation per research.md section 1

/**
 * Generates a cryptographically secure invitation token
 * Uses CSPRNG with 32 bytes entropy (256 bits) per NFR-005
 * @returns Base64url-encoded token string (43 characters)
 */
export function generateInvitationToken(): string {
  // Generate 32 random bytes using Web Crypto API
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)

  // Convert to base64url (URL-safe encoding per RFC 4648)
  const base64 = btoa(String.fromCharCode(...randomBytes))
  const base64url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return base64url
}

/**
 * Hashes a token using SHA-256
 * Stores only the hash in database, never the raw token
 * @param token - Raw invitation token
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Validates a token against its stored hash
 * Uses constant-time comparison to prevent timing attacks
 * @param token - Raw token from URL
 * @param hash - Stored hash from database
 * @returns true if token matches hash
 */
export async function validateToken(
  token: string,
  hash: string
): Promise<boolean> {
  const tokenHash = await hashToken(token)

  // Constant-time string comparison
  if (tokenHash.length !== hash.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < tokenHash.length; i++) {
    result |= tokenHash.charCodeAt(i) ^ hash.charCodeAt(i)
  }

  return result === 0
}

/**
 * Checks if an invitation has expired
 * @param expiresAt - ISO 8601 timestamp from database
 * @returns true if invitation has expired
 */
export function isTokenExpired(expiresAt: string): boolean {
  const expirationDate = new Date(expiresAt)
  const now = new Date()
  return expirationDate < now
}
