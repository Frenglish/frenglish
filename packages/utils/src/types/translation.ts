export type FileContent = {
    fileId: string
    content: string | Buffer
}

export type TranslationResponse = {
    language: string
    files: FileContent[]
}

export type TranslationStatusResponse = {
    status: TranslationStatus
}

export type CompletedTranslationResponse = {
    translationId: number;
    content: TranslationResponse[];
}

export type RequestTranslationResponse = {
    translationId: number;
}

export enum TranslationStatus {
    CANCELLED = 'CANCELLED',
    QUEUED = 'QUEUED',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
  }

/**
 * Represents a file with its content and language metadata for translation.
 */
export interface FileContentWithLanguage {
  /** Unique identifier for the file */
  fileId: string;
  /** The content of the file as a string */
  content: string;
  /** The language code of the file content (e.g. 'en', 'fr', 'es') */
  language: string;
}

export interface FlatJSON {
    path: string[] // Array of keys for giving value in json
    translationComment?: string // Optional translation comment for the value
    value: any // Value associated with path in json
  }