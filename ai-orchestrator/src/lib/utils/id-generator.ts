import { createId } from '@paralleldrive/cuid2';

/**
 * Generates a secure, unique ID.
 * @returns A new CUID2 string.
 */
export function generateId(): string {
  return createId();
}

/**
 * A more descriptive alias for generating session IDs.
 * @returns A new CUID2 string for use as a session ID.
 */
export function generateSessionId(): string {
  return generateId();
}

/**
 * A more descriptive alias for generating message IDs.
 * @returns A new CUID2 string for use as a message ID.
 */
export function generateMessageId(): string {
  return generateId();
}
