import { Configuration } from '@/types/configuration'
import pkg from 'crypto-js'
const { SHA256 } = pkg
import { ExtractionResult } from '@/types/translation'
  
export const TRANSLATABLE_ATTRIBUTES = [
  'alt',
  'title',
  'placeholder',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-valuetext',
  'accesskey',
  'download',
  'prompt',
  'label',
  // 'value' handled contextually
  // 'content' in <meta> tags handled contextually
  // data-* attributes handled contextually
]
  
const DEFAULT_EXCLUDED_SELECTORS = ['.no-translate']
  
/**
 * HTML elements that are purely for styling or text decoration.
 * These elements should be treated as part of the text content when they appear together.
 * Note: Elements like <code>, <kbd>, <samp>, <var> are excluded as they typically contain
 * code or technical content that shouldn't be translated.
 */
const STYLING_ELEMENTS = [
  // Basic text styling
  'strong', 'em', 'b', 'i',
  'u', 'span', 'mark', 'small',
  'sub', 'sup', 'del', 'ins',
  'cite', 'dfn', 'abbr', 'time',
  'q', 's', 'strike', 'tt',
  'big', 'font', 'acronym', 'bdo',
  // Ruby annotations
  'ruby', 'rt', 'rp',
  // Text control
  'wbr'
]
  
const MAX_BLOCK_SIZE = 5000 // Maximum characters for a block-level translation
  
/**
 * Processes a single HTML element for translation.
 * @param element - The HTML element to process
 * @param textMap - The map to store text placeholders
 * @param excludedSelectors - Selectors to exclude from translation
 * @param nextDataContent - Content of __NEXT_DATA__ script if present
 */
function processElement(
  element: any,
  textMap: { [placeholder: string]: string },
  excludedSelectors: string[],
  nextDataContent: string | null
): void {
  const tagName = element.tagName.toLowerCase()
  const inputType = element.getAttribute('type')?.toLowerCase() || ''

  // Skip if excluded
  if (excludedSelectors.some(sel => element.matches(sel))) {
    return
  }

  // Skip <style>
  if (tagName === 'style') {
    return
  }

  // Skip <script> if NOT __NEXT_DATA__
  if (tagName === 'script' && element.id !== '__NEXT_DATA__') {
    return
  }

  // Special handling for __NEXT_DATA__
  if (tagName === 'script' && element.id === '__NEXT_DATA__' && nextDataContent) {
    try {
      const jsonData = JSON.parse(nextDataContent)
      if (Object.prototype.hasOwnProperty.call(jsonData, 'props')) {
        jsonData.props = processNextDataValue(jsonData.props, textMap)
      }
      element.textContent = JSON.stringify(jsonData)
    } catch (e) {
      console.error('Error processing __NEXT_DATA__ JSON:', e)
    }
    return
  }

  // Handle translatable attributes first, before processing content
  TRANSLATABLE_ATTRIBUTES.forEach(attrName => {
    const attrValue = element.getAttribute(attrName)
    if (attrValue && attrValue.trim() !== '') {
      const originalText = attrValue.trim()
      const placeholder = generatePlaceholder(originalText)
      textMap[placeholder] = originalText
      element.setAttribute(attrName, placeholder)
    }
  })

  // 'value' for button/option
  const valueAttr = element.getAttribute('value')
  if (valueAttr) {
    if (
      tagName === 'button' ||
      tagName === 'option' ||
      (tagName === 'input' && ['button', 'submit', 'reset'].includes(inputType))
    ) {
      if (valueAttr.trim()) {
        const placeholder = generatePlaceholder(valueAttr.trim())
        textMap[placeholder] = valueAttr.trim()
        element.setAttribute('value', placeholder)
      }
    }
  }

  // meta 'content' for recognized names
  if (tagName === 'meta' && element.getAttribute('content')) {
    const metaName = (element.getAttribute('name') || '').toLowerCase()
    if (
      ['description', 'keywords', 'author', 'og:title', 'og:description'].includes(metaName)
    ) {
      const contentVal = element.getAttribute('content') || ''
      if (contentVal.trim()) {
        const placeholder = generatePlaceholder(contentVal.trim())
        textMap[placeholder] = contentVal.trim()
        element.setAttribute('content', placeholder)
      }
    }
  }

  // data-* attributes
  Array.from(element.attributes).forEach(attr => {
    const typedAttr = attr as { name: string; value: string }
    if (typedAttr.name.startsWith('data-') && ['data-tooltip', 'data-title'].includes(typedAttr.name)) {
      const val = typedAttr.value
      if (val.trim()) {
        const placeholder = generatePlaceholder(val.trim())
        textMap[placeholder] = val.trim()
        element.setAttribute(typedAttr.name, placeholder)
      }
    }
  })

  // If element contains only text nodes and styling elements, treat as a single unit
  const hasOnlyTextAndStyling = Array.from(element.children as HTMLCollectionOf<Element>).every(child => {
    const childTag = child.tagName.toLowerCase()
    return STYLING_ELEMENTS.includes(childTag)
  }) && Array.from(element.childNodes as NodeListOf<Node>).some(node => node.nodeType === 3)

  if (hasOnlyTextAndStyling) {
    const fullText = element.textContent || ''
    if (fullText.trim()) {
      const placeholder = generatePlaceholder(fullText)
      textMap[placeholder] = fullText
      element.innerHTML = placeholder
      return // Skip processing children since we've handled the entire content
    }
  }

  // Process text nodes that aren't part of a styling group
  Array.from(element.childNodes).forEach((node: unknown) => {
    if ((node as { nodeType: number }).nodeType === 3) { // Node.TEXT_NODE
      const textNode = node as unknown as { data: string; parentElement: any }
      const parentElement = textNode.parentElement

      // Skip if parent is code/pre or excluded
      if (!parentElement || parentElement.matches('code, pre')) return
      if (excludedSelectors.some(sel => parentElement.matches(sel))) return

      const fullText = textNode.data || ''
      const leadingMatch = fullText.match(/^\s*/)
      const trailingMatch = fullText.match(/\s*$/)
      const leadingSpace = leadingMatch ? leadingMatch[0] : ''
      const trailingSpace = trailingMatch ? trailingMatch[0] : ''
      const middleText = fullText.slice(
        leadingSpace.length,
        fullText.length - trailingSpace.length
      )

      if (middleText.trim() !== '') {
        const placeholder = generatePlaceholder(middleText)
        textMap[placeholder] = middleText
        textNode.data = leadingSpace + placeholder + trailingSpace
      }
    }
  })

  // Process child elements
  Array.from(element.children).forEach(child => {
    processElement(child, textMap, excludedSelectors, nextDataContent)
  })
}

export async function extractStrings(
  html: string,
  config: Configuration
): Promise<ExtractionResult> {
  const excludedBlocks = config?.excludedTranslationBlocks || []
  const maxBlockSize = config?.maxBlockSize || MAX_BLOCK_SIZE
  
  // Pre-process __NEXT_DATA__ script to handle JSON content
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__">([\s\S]*?)<\/script>/)
  let processedHtml = html
  let nextDataContent: string | null = null
  
  if (nextDataMatch) {
    nextDataContent = nextDataMatch[1].trim()
    // Replace the script content with a placeholder to avoid parsing issues
    processedHtml = html.replace(
      /<script id="__NEXT_DATA__">[\s\S]*?<\/script>/,
      '<script id="__NEXT_DATA__"></script>'
    )
  }
  
  const doc = await createDocument(processedHtml)
  const textMap: { [placeholder: string]: string } = {}
  
  // Build final excluded selectors
  const excludedSelectors = [...DEFAULT_EXCLUDED_SELECTORS]
  excludedBlocks.forEach(blockConfig => {
    if (blockConfig.blocks && blockConfig.blocks.length > 0) {
      blockConfig.blocks.forEach(block => {
        if (block.selector) {
          excludedSelectors.push(block.selector)
        }
      })
    }
  })
  
  // Start processing from the document body
  processElement(doc.documentElement, textMap, excludedSelectors, nextDataContent)
  
  return {
    textMap,
    modifiedHtml: doc.documentElement.outerHTML
  }
}
  
/**
 * Processes Next.js JSON data for translation.
 */
function processNextDataValue(
  value: any,
  textMap: { [placeholder: string]: string }
): any {
  if (typeof value === 'string' && value.trim()) {
    const placeholder = generatePlaceholder(value)
    textMap[placeholder] = value
    return placeholder
  }
  if (Array.isArray(value)) {
    return value.map(item => processNextDataValue(item, textMap))
  }
  if (typeof value === 'object' && value !== null) {
    const processed: Record<string, any> = {}
    for (const [key, val] of Object.entries(value)) {
      processed[key] = processNextDataValue(val, textMap)
    }
    return processed
  }
  return value
}
  
/**
 * Generates a unique placeholder based on the original text.
 * @param original - The original text.
 * @returns A unique placeholder string.
 */
export function generatePlaceholder(original: string): string {
  const key = SHA256(original.trim()).toString()
  return `${key}`
}
  
/**
* Creates a document that works in both browser and Node.js environments
*/
export async function createDocument(html: string): Promise<Document> {
  if (typeof window !== 'undefined' && window.document) {
    // Browser environment
    const parser = new DOMParser()
    return parser.parseFromString(html, 'text/html')
  }
  
  // For Node.js environment, dynamically import JSDOM 
  // This ensures the code works in browsers without trying to load JSDOM
  try {
    // Use dynamic import to avoid bundling JSDOM in browser builds
    const jsdomModule = await import('jsdom')
    const { JSDOM } = jsdomModule
    const dom = new JSDOM(html)
    return dom.window.document
  } catch (error) {
    throw new Error('No DOM parser available: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}