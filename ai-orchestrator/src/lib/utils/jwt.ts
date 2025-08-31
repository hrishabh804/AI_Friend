
import jwt from 'jsonwebtoken';
import { config } from '@/config';

interface ScopedTokenPayload {
  sessionId: string;
  userId: string;
  role: 'user' | 'agent' | 'admin';
  [key: string]: any;
}

/**
 * Generates a short-lived JWT with a specific scope and payload.
 * @param payload - The data to include in the token.
 * @param expiresIn - The token's expiration time (e.g., '15m', '1h').
 * @returns The generated JWT.
 */
export function generateScopedToken(
  payload: ScopedTokenPayload,
  expiresIn: string | number,
): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
}

/**
 * Verifies a JWT and returns its payload if valid.
 * @param token - The JWT to verify.
 * @returns The decoded token payload, or null if verification fails.
 */
export function verifyScopedToken(
  token: string,
): ScopedTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return decoded as ScopedTokenPayload;
  } catch (error) {
    // This will catch expired tokens, invalid signatures, etc.
    return null;
  }
}
