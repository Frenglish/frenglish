interface ExtractionResult {
    modifiedHtml: string;
    textMap: {
        [placeholder: string]: string;
    };
}
export declare function htmlToJsonAndPlaceholders(html: string, projectID: number): Promise<ExtractionResult>;
export declare function jsonToHtml(translatedTextMap: {
    [placeholder: string]: string;
}, modifiedHtml: string, language?: string): string;
export declare function injectHTMLOverwrite(html: string, language?: string): string;
export declare function languageReadingDirection(language: string): 'rtl' | 'ltr';
export {};
