import { IFileHandler, Placeholder } from './IFileHandler.js';
/**
 * Handles placeholder insertion and replacement for DOCX files.
 */
export declare class DocxHandler implements IFileHandler {
    /**
     * Inserts placeholders into the DOCX content.
     * @param rawContent - The original DOCX file as Buffer (without placeholders).
     * @returns The placeholders mapping and the modified DOCX Buffer.
     */
    insertPlaceholders(rawContent: Buffer): Promise<Placeholder>;
    /**
     * Replaces placeholders in the DOCX content with translated text.
     * @param rawContent - The original DOCX file as Buffer (without placeholders).
     * @param translatedPlaceholders - The mapping of placeholders to translated text.
     * @returns The translated DOCX Buffer.
     */
    replacePlaceholders(rawContent: Buffer, translatedPlaceholders: Record<string, string>): Promise<Buffer>;
}
