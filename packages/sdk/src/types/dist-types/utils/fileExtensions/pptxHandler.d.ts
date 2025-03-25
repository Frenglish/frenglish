import { IFileHandler, Placeholder } from './IFileHandler.js';
/**
 * Handles placeholder insertion and replacement for PPTX (and Keynote) files.
 */
export declare class PptxHandler implements IFileHandler {
    /**
     * Inserts placeholders into the PPTX content.
     * @param rawContent - The original PPTX file as Buffer (without placeholders).
     * @returns The placeholders mapping and the modified PPTX Buffer.
     */
    insertPlaceholders(rawContent: Buffer): Promise<Placeholder>;
    /**
     * Replaces placeholders in the PPTX content with translated text.
     * @param rawContent - The original PPTX file as Buffer (without placeholders).
     * @param translatedPlaceholders - The mapping of placeholders to translated text.
     * @returns The translated PPTX Buffer.
     */
    replacePlaceholders(rawContent: Buffer, translatedPlaceholders: Record<string, string>): Promise<Buffer>;
    /**
     * Extracts text elements and generates placeholders.
     * @param textElements - Collection of text elements in the XML.
     * @returns A mapping of placeholders to original text.
     */
    private extractTextElements;
    /**
     * Inserts placeholders into the XML document.
     * @param xmlDoc - The XML Document of a slide.
     * @param placeholders - The mapping of placeholders to original text.
     */
    private insertPlaceholdersInXml;
    /**
     * Handles extraction and insertion of placeholders in Keynote slides.
     * @param zip - The PizZip instance containing the unzipped Keynote file.
     * @returns The placeholders mapping.
     */
    private extractAndInsertKeynotePlaceholders;
    /**
     * Replaces placeholders in the XML document with translated text.
     * @param xmlDoc - The XML Document of a slide.
     * @param translatedPlaceholders - The mapping of placeholders to translated text.
     */
    private replacePlaceholdersInXml;
    /**
     * Handles replacement of placeholders in Keynote slides with translated text.
     * @param zip - The PizZip instance containing the unzipped Keynote file.
     * @param translatedPlaceholders - The mapping of placeholders to translated text.
     * @returns The translated Keynote Buffer.
     */
    private handleKeynoteReplacement;
}
