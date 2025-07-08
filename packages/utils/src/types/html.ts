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

export interface OriginalTagInfo {
  tagName: string;
  attributes: { [key: string]: string };
}

// Alias kept to avoid breaking existing references in downstream code
export type MasterStyleMap = {
  [hash: string]: {
      styleMap: { [ph: string]: OriginalTagInfo },
      hrefMap: { [ph: string]: string }
  };
};

export type CompressionResult = {
    compressedString: string;
    styleMap: { [ph: string]: OriginalTagInfo };
    hrefMap: { [ph: string]: string };          // NEW
}