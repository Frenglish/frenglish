export interface ExtractStringsOptions {
  /** collect selector / attribute info for each string */
  captureContext?: boolean;
}

export interface ExtractionResult {
  modifiedHtml: string
  textMap: { [placeholder: string]: string }
  stringsWithContext?: ExtractedStringWithContext[]
}

export interface ExtractedStringWithContext {
  hash: string;
  text: string;
  selector?: string;
  attribute?: string;
  isHtmlBlock?: boolean;
  isTextNode?: boolean;
  isCompressedStructure?: boolean;
}