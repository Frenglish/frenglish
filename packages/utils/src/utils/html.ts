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
 * Block-level tags to treat as a single placeholder if they don't contain <code> or <pre>.
 */
const BLOCK_LEVEL_TAGS = [
  'p',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'caption',
  'figcaption',
  'address',
  'summary',
  'li',
]
  
/**
 * EXTRACT PHASE
 *  - Skips <code>/<pre> text
 *  - If block-level has no <code>/<pre>, treat entire block as one snippet
 *  - Otherwise, do the normal text-node approach
 *  - Also handles attributes, <meta content>, data-*, etc.
 */
export async function extractStrings(
  html: string,
  config: Configuration
): Promise<ExtractionResult> {
  const excludedBlocks = config?.excludedTranslationBlocks || []
  
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
  
  function processElement(element: any) {
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
  
    // If block-level & no <code>/<pre> inside => treat entire block as single snippet
    const isBlockLevel = BLOCK_LEVEL_TAGS.includes(tagName)
    const hasCodeOrPre = element.querySelector('code, pre') !== null
  
    if (isBlockLevel && !hasCodeOrPre) {
      const blockInnerHtml = element.innerHTML
      if (blockInnerHtml.trim()) {
        const placeholder = generatePlaceholder(blockInnerHtml)
        textMap[placeholder] = blockInnerHtml
        element.innerHTML = placeholder
      }
    } else {
      // Normal text-node approach
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
    }
  
    // Handle translatable attributes
    TRANSLATABLE_ATTRIBUTES.forEach(attrName => {
      const attrValue = element.getAttribute(attrName)
      if (attrValue && attrValue.trim() !== '') {
        const originalText = attrValue.trim()
        const placeholder = generatePlaceholder(originalText)
        textMap[placeholder] = originalText
        element.setAttribute(attrName, attrValue.replace(originalText, placeholder))
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
          element.setAttribute('value', valueAttr.replace(valueAttr.trim(), placeholder))
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
          element.setAttribute(
            'content',
            contentVal.replace(contentVal.trim(), placeholder)
          )
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
          element.setAttribute(typedAttr.name, val.replace(val.trim(), placeholder))
        }
      }
    })
  
    // Process child elements
    Array.from(element.children).forEach(child => {
      processElement(child)
    })
  }
  
  // Start processing from the document body
  processElement(doc.documentElement)
  
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