import { IFileHandler, Placeholder } from './IFileHandler.js';
/**
 * Handles placeholder insertion and replacement for Markdown files.
 */
export declare class MarkdownHandler implements IFileHandler {
    /**
       * Inserts placeholders into the Markdown content.
       * @param rawContent - The original Markdown content as string (without placeholders).
       * @returns The placeholders mapping and the modified Markdown content.
       */
    insertPlaceholders(rawContent: string): Promise<Placeholder>;
    /**
       * Replaces placeholders in the Markdown content with translated text.
       * @param rawContent - The original Markdown content as string (without placeholders).
       * @param translatedPlaceholders - The mapping of placeholders to translated text.
       * @returns The translated Markdown content as string.
       */
    replacePlaceholders(rawContent: string, translatedPlaceholders: Record<string, string>): Promise<string>;
    private getProcessor;
    private stringifyTree;
    private parseTree;
}
