export interface IFileHandler {
    /**
     * Inserts placeholders into the original file and returns the placeholders mapping.
     * @param rawContent - The original file content as Buffer or string.
     * @returns An object containing the mapping and the content with placeholders.
     */
    insertPlaceholders(rawContent: Buffer | string): Promise<Placeholder>;
    /**
     * Replaces placeholders in the content with translated text.
     * @param contentWithPlaceholders - The content containing placeholders.
     * @param translatedPlaceholders - The mapping of placeholders to translated text.
     * @returns The translated file content as Buffer or string.
     */
    replacePlaceholders(contentWithPlaceholders: Buffer | string, translatedPlaceholders: Record<string, string>): Promise<Buffer | string>;
}
export type Placeholder = {
    placeholders: Record<string, string>;
    contentWithPlaceholders: Buffer | string;
};
