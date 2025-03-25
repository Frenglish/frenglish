/**
 * Generates a unique hash for a given text.
 * @param text - The original text.
 * @returns The SHA-256 hash of the text.
 */
export declare function hash(text: string): string;
/**
 * Generates a unique placeholder based on the original text.
 * @param original - The original text.
 * @returns A unique placeholder string.
 */
export declare function generatePlaceholder(original: string): string;
/**
 * Escapes special characters in a string for use in a regular expression.
 * @param string - The string to escape.
 * @returns The escaped string.
 */
export declare function escapeRegExp(string: string): string;
