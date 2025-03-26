/**
 * Represents a file in the Frenglish system.
 */
export interface File {
  /** The name of the file */
  name: string;
  /** The content of the file */
  content: string;
  /** The MIME type of the file */
  type: string;
  /** The size of the file in bytes */
  size: number;
  /** The last modified date of the file */
  lastModified: number;
}