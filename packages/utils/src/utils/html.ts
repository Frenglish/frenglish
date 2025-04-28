import { Configuration } from '@/types/configuration'; // Assuming types are defined here
import pkg from 'crypto-js';
const { SHA256 } = pkg;
import { ExtractedStringWithContext, ExtractionResult } from '@/types/translation'; // Assuming types are defined here
import { extractTextComponents } from './utils.js'; // Assuming utils are defined here

// --- Polyfills for Node.js Environment ---
if (typeof window === 'undefined') {
  global.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    COMMENT_NODE: 8,
  } as any;

  global.NodeFilter = {
    SHOW_ALL: -1,
    SHOW_ELEMENT: 1,
    SHOW_TEXT: 4,
    SHOW_COMMENT: 128,
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
    FILTER_SKIP: 3
  } as any;

  if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
    (global as any).CSS = {
      escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (match) => `\\${match}`)
    };
  }
}

// --- Constants ---

export const TRANSLATABLE_ATTRIBUTES = [
  'alt', 'title', 'description', 'placeholder', 'aria-label',
  'aria-labelledby', 'aria-describedby', 'aria-valuetext',
  'accesskey', 'download', 'prompt', 'label',
  // Does NOT include: 'value', 'content', data-* (handled contextually in processGenericAttributes)
];

// Specific data-* attributes considered translatable
const TRANSLATABLE_DATA_ATTRIBUTES = ['data-tooltip', 'data-title', 'data-label', 'data-description'];

// Contextually translatable attributes based on element type
const CONTEXTUAL_VALUE_ELEMENTS = ['button', 'option'];
const CONTEXTUAL_VALUE_INPUT_TYPES = ['button', 'submit', 'reset'];
const CONTEXTUAL_META_NAMES = ['description', 'keywords', 'author', 'og:title', 'og:description', 'og:site_name', 'twitter:title', 'twitter:description', 'application-name', 'msapplication-tooltip'];


const DEFAULT_EXCLUDED_SELECTORS = ['.no-translate', 'script', 'style', 'code', 'pre', 'noscript'];
const INLINE_TAGS = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'img']);

// --- Helper Functions (Placeholders - ensure these are correctly implemented/imported) ---

// generatePlaceholder still trims internally for hash consistency, but we won't trim *before* calling it
export function generatePlaceholder(original: string): string {
  const key = SHA256(original.trim()).toString(); // Internal trim for hash is okay
  return `${key}`;
}

export async function createDocument(html: string): Promise<Document> {
    if (typeof window !== 'undefined' && window.document) {
      const parser = new DOMParser();
      return parser.parseFromString(html, 'text/html');
    }
    try {
      const jsdomModule = await import('jsdom');
      const { JSDOM } = jsdomModule;
      const dom = new JSDOM(html);
      return dom.window.document;
    } catch (error) {
      console.error("JSDOM module not found. Please install 'jsdom'.");
      throw new Error('No DOM parser available: ' + (error instanceof Error ? error.message : String(error)));
    }
}

function getSpecificCssPath(element: Element, maxDepth = 7): string {
     if (!element || maxDepth <= 0 || !element.parentElement || element.tagName === 'BODY' || element.tagName === 'HTML') {
        return element.tagName?.toLowerCase() || '';
    }
    const path: string[] = [];
    let current: Element | null = element;
    let depth = 0;
     while (current && current.nodeType === Node.ELEMENT_NODE && current.tagName !== 'BODY' && current.tagName !== 'HTML' && depth < maxDepth) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
            selector += `#${CSS.escape(current.id)}`; path.unshift(selector); break;
        } else {
            const parent = current.parentElement;
            if (parent) {
                 const classSelector = Array.from(current.classList).filter(cls => !/^\d+$/.test(cls) && cls).map(cls => `.${CSS.escape(cls)}`).join('');
                 if (classSelector) { selector += classSelector; } else {
                     let siblingIndex = 1; let sibling = current.previousElementSibling;
                     while (sibling) { if (sibling.tagName === current.tagName) siblingIndex++; sibling = sibling.previousElementSibling; }
                     const childrenOfSameType = Array.from(parent.children).filter(child => child.tagName === current!.tagName).length;
                     if (siblingIndex > 1 || childrenOfSameType > 1) selector += `:nth-of-type(${siblingIndex})`;
                 }
            }
        }
        path.unshift(selector); current = current.parentElement; depth++;
    }
     if (current && (current.tagName === 'BODY' || current.tagName === 'HTML')) { path.unshift(current.tagName.toLowerCase()); }
     else if (path.length === 0 && element.tagName) { path.unshift(element.tagName.toLowerCase()); }
     return path.join(' > ');
}

/**
 * NEW: Helper function to check if an element likely contains translatable content.
 * Used by shouldExtractAsBlock. Checks attributes and direct text nodes.
 */
function hasTranslatableContent(element: Element): boolean {
    // 1. Check standard translatable attributes on the element itself
    for (const attrName of TRANSLATABLE_ATTRIBUTES) {
        // Handle 'alt' specifically: only counts if non-empty (trim check okay here for boolean decision)
        if (attrName === 'alt' && element.tagName.toLowerCase() === 'img') {
            if (element.getAttribute('alt')?.trim()) return true;
        } else {
            // Check if attribute exists and has *some* content (trim check okay for boolean decision)
            if (element.getAttribute(attrName)?.trim()) return true;
        }
    }
     // 2. Check contextual attributes (trim check okay for boolean decision)
     const tagName = element.tagName.toLowerCase();
     const inputType = element.getAttribute('type')?.toLowerCase() || '';
     if (element.getAttribute('value')?.trim() &&
         (CONTEXTUAL_VALUE_ELEMENTS.includes(tagName) || (tagName === 'input' && CONTEXTUAL_VALUE_INPUT_TYPES.includes(inputType)))) {
         return true;
     }
     if (tagName === 'meta' && element.getAttribute('content')?.trim()) {
         const metaName = (element.getAttribute('name') || element.getAttribute('property') || '').toLowerCase();
         if (CONTEXTUAL_META_NAMES.some(name => metaName.startsWith(name))) return true;
     }
     for(const dataAttr of TRANSLATABLE_DATA_ATTRIBUTES) {
         if (element.getAttribute(dataAttr)?.trim()) return true;
     }

    // 3. Check direct child text nodes for non-whitespace content (trim check okay for boolean decision)
    for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            return true;
        }
    }
    return false;
}


/**
 * REFINED: Decides if an element's content qualifies for extraction as a single HTML block.
 * Now verifies if the inline content actually contains translatable text/attributes.
 */
function shouldExtractAsBlock(element: Element, excludedSelectors: string[]): boolean {
    const tagNameLower = element.tagName.toLowerCase();

    // Initial exclusions - keep <img> excluded, but allow <a> to be checked below.
    if (tagNameLower === 'img') return false;
    if (excludedSelectors.some(selector => element.matches(selector))) return false;
    // If only text/comment nodes, don't extract as block, let text node logic handle it
    if (Array.from(element.childNodes).every(n => n.nodeType === Node.TEXT_NODE || n.nodeType === Node.COMMENT_NODE)) return false;

    let hasInlineChild = false;
    let hasBlockChild = false;
    let containsTranslatable = false; // Use hasTranslatableContent for this check

    for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const childElement = node as Element;
            const childTagNameLower = childElement.tagName.toLowerCase();

            // If a direct child is an <a> tag, prevent block extraction of the parent.
            if (childTagNameLower === 'a') {
                return false;
            }

            if (excludedSelectors.some(selector => childElement.matches(selector))) {
                 continue;
            }

            if (INLINE_TAGS.has(childTagNameLower)) {
                hasInlineChild = true;
                // Check if this inline element *or its descendants* have translatable content
                if (!containsTranslatable && (hasTranslatableContent(childElement) || childElement.querySelector('*') && Array.from(childElement.querySelectorAll('*')).some(hasTranslatableContent))) {
                   containsTranslatable = true;
                }
            } else {
                hasBlockChild = true;
                break; // Found a block child, stop checking
            }
        } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            // Found a non-empty text node, potential for translation
            containsTranslatable = true;
            // Check if siblings include inline elements
             if (Array.from(element.childNodes).some(n => n.nodeType === Node.ELEMENT_NODE && INLINE_TAGS.has((n as Element).tagName.toLowerCase()))) {
                hasInlineChild = true;
             }
        }
    }

    // Extract as block if it has inline children, no block children, and contains some translatable content.
    const potentiallyExtractable = hasInlineChild && !hasBlockChild;
    return potentiallyExtractable && containsTranslatable;
}

function processGenericAttributes(
    element: Element, textMap: { [placeholder: string]: string },
    stringsWithContext: ExtractedStringWithContext[], captureContext: boolean
) {
    const tagName = element.tagName.toLowerCase();
    const inputType = element.getAttribute('type')?.toLowerCase() || '';

    // 1. Standard translatable attributes (from global list)
    for (const attrName of TRANSLATABLE_ATTRIBUTES) {
        // 'alt' for <img> is handled in the specific img block, skip here
        if (tagName === 'img' && attrName === 'alt') continue;
        // 'href' for <a> is never translated, skip here
        if (tagName === 'a' && attrName === 'href') continue;

        const attrValue = element.getAttribute(attrName);
        // MINIMAL CHANGE: Check if attribute value exists and is not empty string, DON'T trim here.
        if (attrValue) { // Check for existence and non-emptiness
            const originalText = attrValue; // Use the original value
            const placeholder = generatePlaceholder(originalText); // Hash based on trimmed, but use original below
            textMap[placeholder] = originalText; // Store the ORIGINAL value with spacing
            element.setAttribute(attrName, placeholder);
            if (captureContext) stringsWithContext.push({ hash: placeholder, text: originalText, selector: getSpecificCssPath(element), attribute: attrName });
        }
    }

    // 2. Contextual 'value' attribute
    const valueAttr = element.getAttribute('value');
    // MINIMAL CHANGE: Check if valueAttr exists and is not empty, DON'T trim here. Check context.
    if (valueAttr &&
        (CONTEXTUAL_VALUE_ELEMENTS.includes(tagName) || (tagName === 'input' && CONTEXTUAL_VALUE_INPUT_TYPES.includes(inputType)))
       ) {
        const originalText = valueAttr; // Use the original value
        const placeholder = generatePlaceholder(originalText);
        textMap[placeholder] = originalText; // Store the ORIGINAL value with spacing
        element.setAttribute('value', placeholder);
        if (captureContext) stringsWithContext.push({ hash: placeholder, text: originalText, selector: getSpecificCssPath(element), attribute: 'value' });
    }

    // 3. Contextual 'content' attribute for <meta>
    if (tagName === 'meta') {
        const contentAttr = element.getAttribute('content');
        const metaName = (element.getAttribute('name') || element.getAttribute('property') || '').toLowerCase();
        // MINIMAL CHANGE: Check if contentAttr exists and is not empty, DON'T trim here. Check context.
        if (contentAttr && CONTEXTUAL_META_NAMES.some(name => metaName.startsWith(name))) {
            const originalText = contentAttr; // Use the original value
            const placeholder = generatePlaceholder(originalText);
            textMap[placeholder] = originalText; // Store the ORIGINAL value with spacing
            element.setAttribute('content', placeholder);
            if (captureContext) stringsWithContext.push({ hash: placeholder, text: originalText, selector: getSpecificCssPath(element), attribute: 'content' });
        }
    }

    // 4. Specific translatable data-* attributes
    for (const dataAttr of TRANSLATABLE_DATA_ATTRIBUTES) {
        const attrValue = element.getAttribute(dataAttr);
        // MINIMAL CHANGE: Check if attrValue exists and is not empty, DON'T trim here.
        if (attrValue) {
            const originalText = attrValue; // Use the original value
            const placeholder = generatePlaceholder(originalText);
            textMap[placeholder] = originalText; // Store the ORIGINAL value with spacing
            element.setAttribute(dataAttr, placeholder);
            if (captureContext) stringsWithContext.push({ hash: placeholder, text: originalText, selector: getSpecificCssPath(element), attribute: dataAttr });
        }
    }
}

function processJsonValue(
    value: any, textMap: { [placeholder: string]: string },
    stringsWithContext: ExtractedStringWithContext[], captureContext: boolean | undefined,
    contextPath: string
): any {
     // MINIMAL CHANGE: Check if it's a non-empty string, but DON'T trim for storage.
     if (typeof value === 'string' && value) {
        // Check if it looks like HTML, skip if so (simple check)
        if (/<[a-z][\s\S]*>/i.test(value)) return value;

        // Check if the trimmed version is empty. If so, don't process.
        if (!value.trim()) return value;

        const originalText = value; // Use the original value
        const placeholder = generatePlaceholder(originalText);
        textMap[placeholder] = originalText; // Store the ORIGINAL value with spacing

        if (captureContext) stringsWithContext.push({ hash: placeholder, text: originalText, selector: contextPath });

        // Reconstruct with original spacing around placeholder
        const leadingSpace = value.match(/^\s*/)?.[0] || '';
        const trailingSpace = value.match(/\s*$/)?.[0] || '';
        // The placeholder replaces the *trimmed* part conceptually
        return leadingSpace + placeholder + trailingSpace;
     } else if (Array.isArray(value)) {
        return value.map((item, index) => processJsonValue(item, textMap, stringsWithContext, captureContext, `${contextPath}[${index}]`));
     } else if (typeof value === 'object' && value !== null) {
        const processed: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
            const escapedKey = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(key) ? `.${key}` : `['${key.replace(/'/g, "\\'")}']`;
            const newPath = contextPath === '__NEXT_DATA__' ? `__NEXT_DATA__${escapedKey}` : `${contextPath}${escapedKey}`;
            processed[key] = processJsonValue(val, textMap, stringsWithContext, captureContext, newPath);
        }
        return processed;
     }
     return value;
}

// --- Main Extraction Function ---

interface OriginalTagInfo {
    tagName: string;
    attributes: { [key: string]: string };
}
export type StyleMap = { [placeholder: string]: OriginalTagInfo };
export type MasterStyleMap = { [hash: string]: StyleMap };

// --- Placeholder Function: Define which elements get compressed inside a chunk ---
// This determines tags like <span>, <strong> etc. that become <styling_N>
// It should generally be inline, non-functional elements.
function isCompressibleInlineElement(element: Element): boolean {
    const tagNameLower = element.tagName.toLowerCase();
    const compressibleTags = new Set([
        'span', 'strong', 'em', 'i', 'b', 'u', 'sub', 'sup', 'mark', 'small', 'font'
        // Add or remove tags as needed
    ]);
    // Exclude elements with complex children or specific roles if necessary
    return compressibleTags.has(tagNameLower);
}

/**
 * Compresses HTML structure within a given HTML string chunk.
 * Replaces compressible inline elements with <styling_N> placeholders.
 * @param htmlChunk The HTML string to compress.
 * @param doc A Document instance to use for parsing.
 * @returns Object containing the compressed string and its style map.
 */
async function compressHTML(htmlChunk: string, doc: Document): Promise<{ compressedString: string, styleMap: StyleMap }> {
    const styleMap: StyleMap = {};
    let styleCounter = 0;
    // Use a temporary container to parse the chunk reliably
    const container = doc.createElement('div');
    container.innerHTML = htmlChunk;

    function traverseAndCompress(node: Node): string {
        switch (node.nodeType) {
            case Node.TEXT_NODE:
                return node.textContent || '';
            case Node.ELEMENT_NODE:
                const element = node as Element;
                if (isCompressibleInlineElement(element)) {
                    styleCounter++;
                    const stylePlaceholder = `styling_${styleCounter}`;

                    // Store original tag info
                    const attributes: { [key: string]: string } = {};
                    for (let i = 0; i < element.attributes.length; i++) {
                        const attr = element.attributes[i];
                        attributes[attr.name] = attr.value;
                    }
                    styleMap[stylePlaceholder] = {
                        tagName: element.tagName, // Preserve original case
                        attributes: attributes
                    };

                    // Process children recursively
                    let innerCompressed = '';
                    element.childNodes.forEach(child => {
                        innerCompressed += traverseAndCompress(child);
                    });

                    return `<${stylePlaceholder}>${innerCompressed}</${stylePlaceholder}>`;
                } else {
                    // If an element is NOT compressible inline (e.g., <br>, or nested block)
                    // return its outerHTML or handle as needed. For simplicity,
                    // let's assume chunks sent here mostly contain compressible + text.
                    // We could just process children and ignore the tag, or return outerHTML.
                    // Returning outerHTML preserves non-compressible tags within the chunk.
                    let innerContent = '';
                     element.childNodes.forEach(child => {
                         innerContent += traverseAndCompress(child);
                     });
                     // Reconstruct the tag if needed, or return outerHTML if structure is complex
                     // This part might need refinement based on edge cases.
                     // For now, let's try returning the outerHTML structure but with processed children
                     const tag = element.tagName.toLowerCase();
                     let attrs = '';
                     for (let i = 0; i < element.attributes.length; i++) {
                       const attr = element.attributes[i];
                       attrs += ` ${attr.name}="${escapeAttribute(attr.value)}"`; // Add attribute escaping
                     }
                     // Handle self-closing tags if necessary (e.g., br)
                     const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link'];
                     if (selfClosing.includes(tag)){
                        return `<${tag}${attrs}>`;
                     } else {
                        return `<${tag}${attrs}>${innerContent}</${tag}>`;
                     }
                }
            default:
                // Includes comments, etc.
                return ''; // Or return node.nodeValue for comments if needed
        }
    }

    let compressedResult = '';
    container.childNodes.forEach(child => {
        compressedResult += traverseAndCompress(child);
    });

    return { compressedString: compressedResult, styleMap: styleMap };
}

// Basic attribute escaping
function escapeAttribute(value: string): string {
    return value.replace(/"/g, '&quot;');
}

export async function extractStrings(
    html: string,
    config: Configuration,
    captureContext: boolean = false
): Promise < ExtractionResult & {
    stringsWithContext ? : ExtractedStringWithContext[],
    masterStyleMap ? : MasterStyleMap // Map from hash to chunk's styleMap
} > {
    const textMap: { [placeholder: string]: string } = {};
    const masterStyleMap: MasterStyleMap = {};
    const stringsWithContext: ExtractedStringWithContext[] = [];
    const processedNodes = new Set < Node > ();

    const excludedSelectors = [
        ...DEFAULT_EXCLUDED_SELECTORS,
        ...(config?.excludedTranslationBlocks?.flatMap((block) =>
            block.blocks?.map((b) => b.selector).filter(Boolean) ?? []) ?? [])
    ];

    const doc = await createDocument(html);
    const body = doc.body;


    // --- Special Handling: __NEXT_DATA__ (Keep as is) ---
    const nextDataScript = doc.getElementById('__NEXT_DATA__');
    if (nextDataScript && nextDataScript.tagName.toLowerCase() === 'script') {
        markSubtreeProcessed(nextDataScript, processedNodes);
    }


    // --- Recursive Node Processing Function ---
    async function processNode(node: Node) {
        if (processedNodes.has(node)) {
            return;
        }

        if (node.parentElement && excludedSelectors.some(selector => node.parentElement!.matches(selector))) {
             processedNodes.add(node);
            return;
        }

        switch (node.nodeType) {
            case Node.ELEMENT_NODE:
                const element = node as Element;
                const elemDesc = `<${element.tagName}> ID:[${element.id || ''}] Class:[${element.className || ''}]`;

                // Exclusion check for the element itself
                 if (excludedSelectors.some(selector => element.matches(selector))) {
                    markSubtreeProcessed(element, processedNodes, false); // Mark self and children
                    return;
                 }


                let extractedAsChunk = false;
                // --- Decide if this element is a "translation chunk" ---
                const containsText = (n: Node): boolean => { /* ... same as before ... */
                    if (n.nodeType === Node.TEXT_NODE && (n.textContent?.trim() ?? '').length > 0) return true;
                    if (n.nodeType === Node.ELEMENT_NODE) {
                        for (const child of Array.from(n.childNodes)) { if (containsText(child)) return true; }
                    } return false;
                 };

                // Check for chunk extraction suitability
                if (shouldExtractAsBlock(element, excludedSelectors) && containsText(element)) {
                     const originalInnerHTML = element.innerHTML;

                     if (originalInnerHTML.trim()) {
                        // 1. Compress
                        const { compressedString, styleMap } = await compressHTML(originalInnerHTML, doc);

                        // 2. Generate Hash
                        const placeholder = generatePlaceholder(compressedString);

                        // 3. Store maps
                        textMap[placeholder] = compressedString;
                        masterStyleMap[placeholder] = styleMap;

                        // 4. Replace element's content with the hash
                        try {
                            element.innerHTML = placeholder; // <<<< THE CRITICAL REPLACEMENT
                        } catch (e) {
                             console.error(`[DEBUG extractStrings] Error setting innerHTML for ${elemDesc} with placeholder ${placeholder}:`, e);
                        }


                        // 5. Mark children processed
                        markSubtreeProcessed(element, processedNodes, true);
                        extractedAsChunk = true;

                     }
                }

                // --- Process Attributes & Recurse Children (Only if NOT extracted as chunk) ---
                if (!extractedAsChunk) {
                    processGenericAttributes(element, textMap, stringsWithContext, captureContext);
                    const children = Array.from(element.childNodes);
                    for (const child of children) {
                        await processNode(child); // Process children one after the other
                    }
                }

                // Mark the element itself as processed *after* handling it and its children (if applicable)
                // Avoids re-processing if encountered again through a different traversal path
                processedNodes.add(element);
                break;

            case Node.TEXT_NODE:
                const textNode = node as Text;
                const parentDesc = textNode.parentElement ? `<${textNode.parentElement.tagName}>` : '[No Parent]';

                // Skip if parent is code/pre etc. or if the node itself got marked processed (e.g. by markSubtreeProcessed)
                if (processedNodes.has(node) || textNode.parentElement?.closest('code, pre, script, style, noscript')) {
                    if (!processedNodes.has(node)) processedNodes.add(node); // Ensure marked if skipped due to parent type
                    break;
                }

                const { leadingSpace, middleText, trailingSpace } = extractTextComponents(textNode.nodeValue || '');
                 if (middleText && middleText.trim()) {
                     const placeholder = generatePlaceholder(middleText.trim());
                     textMap[placeholder] = middleText;
                     try {
                        textNode.nodeValue = leadingSpace + placeholder + trailingSpace;
                     } catch (e) {
                         console.error(`Error setting nodeValue for text node child of ${parentDesc}:`, e);
                     }

                     if (captureContext && textNode.parentElement) {
                         stringsWithContext.push({ hash: placeholder, text: middleText, selector: getSpecificCssPath(textNode.parentElement), isTextNode: true });
                     }
                 }
                 processedNodes.add(node);
                break;

             case Node.COMMENT_NODE:
                 processedNodes.add(node);
                 break;

            default:
                processedNodes.add(node);
                break;
        }
    }

    // --- Start Processing ---
    const rootProcessingElement = body || doc.documentElement;
    if (rootProcessingElement) {
        const rootChildren = Array.from(rootProcessingElement.childNodes);
        for (const child of rootChildren) {
           await processNode(child);
        }
    }

    // --- Head Element Processing (Keep as is, assuming correct) ---
     if (doc.head && !processedNodes.has(doc.head)) {
         const titleTag = doc.head.querySelector('title');
         if (titleTag /* && checks */) { /* ... process title text node children ... */ }
         doc.head.querySelectorAll('meta').forEach(meta => { /* ... process meta attributes ... */ });
     }


    // --- Finalize ---
    const modifiedHtml = doc.documentElement.outerHTML;

    return {
        modifiedHtml,
        textMap,
        masterStyleMap,
        stringsWithContext: captureContext ? stringsWithContext : undefined,
    };
}

// Ensure helper functions (markSubtreeProcessed, shouldExtractAsBlock, etc.) are correctly implemented.
// Especially markSubtreeProcessed needs to handle adding all node types in the subtree.
// Example using TreeWalker for markSubtreeProcessed:
function markSubtreeProcessed(element: Element, processedNodes: Set<Node>, skipSelf = false) {
    if (!skipSelf) {
        processedNodes.add(element);
    }
    // Ensure ownerDocument is available
    if (element.ownerDocument && element.hasChildNodes()) {
        const walker = element.ownerDocument.createTreeWalker(
            element,
            NodeFilter.SHOW_ALL // Process elements, text nodes, comments, etc.
        );
        let node;
        // Iterate over descendant nodes (walker starts *inside* the element)
        while ((node = walker.nextNode())) {
            processedNodes.add(node);
        }
    } else if (!skipSelf && !element.hasChildNodes() && !processedNodes.has(element)) {
        processedNodes.add(element);
    }
}