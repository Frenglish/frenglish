import { Configuration } from '@/types/configuration'
import pkg from 'crypto-js'
const { SHA256 } = pkg
import { ExtractionResult } from '@/types/translation'
import { extractTextComponents } from './utils.js'

// Polyfill Node constants for Node.js environment
if (typeof window === 'undefined') {
  global.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    // Add other node types if needed
  } as any
}

export const TRANSLATABLE_ATTRIBUTES = [
  'alt',
  'title',
  'description',
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

/**
 * EXTRACT PHASE
 *  - Skips <code>/<pre> text
 *  - If block-level has no <code>/<pre>, treat entire block as one snippet
 *  - Otherwise, do the normal text-node approach
 *  - Also handles attributes, <meta content>, data-*, etc.
 */
export async function extractStrings(
  html: string,
  config: Configuration,
  injectPlaceholders = true // Whether to inject placeholders in text node
): Promise<ExtractionResult> {
  const excludedBlocks = config?.excludedTranslationBlocks || []
  const textMap: { [placeholder: string]: string } = {}

  // Create a copy of default excluded selectors.
  const excludedSelectors: string[] = [...DEFAULT_EXCLUDED_SELECTORS]
  excludedBlocks.forEach(blockConfig => {
    if (blockConfig.blocks && blockConfig.blocks.length > 0) {
      blockConfig.blocks.forEach(block => {
        if (block.selector) {
          excludedSelectors.push(block.selector)
        }
      })
    }
  })

  // Create a document from the HTML string.
  const doc = await createDocument(html)

  // Process all elements in the document.
  const elements = doc.querySelectorAll('*')
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase()
    const inputType = element.getAttribute('type')?.toLowerCase() || ''

    // Skip if the element or an ancestor already has the marker.
    if (element.hasAttribute('data-frenglish-key')) {
      continue;
    }

    // Skip elements that match any excluded selector.
    if (excludedSelectors.length > 0 && excludedSelectors.some(selector => element.matches(selector))) {
      continue
    }

    // Special handling for __NEXT_DATA__ in <script> tags.
    if (tagName === 'script' && element.id === '__NEXT_DATA__') {
      const scriptContent = element.textContent || ''
      try {
        const jsonData = JSON.parse(scriptContent)
        if (Object.prototype.hasOwnProperty.call(jsonData, 'props')) {
          jsonData.props = processNextDataValue(jsonData.props, textMap)
        }
        element.textContent = JSON.stringify(jsonData)
      } catch (e) {
        console.error("Error processing __NEXT_DATA__ JSON:", e)
      }
      continue
    }

    // ----- Process Text Nodes -----
    // Replace text nodes by wrapping them in a span marked with data-frenglish-key.
    Array.from(element.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text
        const parentElement = textNode.parentElement
        // Skip text nodes inside <style> or <script> tags.
        if (
          parentElement?.tagName.toLowerCase() === 'style' ||
          parentElement?.tagName.toLowerCase() === 'script' ||
          parentElement?.closest('code, pre')
        ) {
          return
        }

        // Skip if the parent element matches any excluded selector.
        if (excludedSelectors.length > 0 && excludedSelectors.some(selector => parentElement?.matches(selector))) {
          return
        }
        const { leadingSpace, middleText, trailingSpace} = extractTextComponents(textNode.data || '')
        if (middleText.trim() !== '') {
          // Generate placeholder
          const placeholder = generatePlaceholder(middleText)
          textMap[placeholder] = middleText

          // Inject data-key
          const span = doc.createElement('span')
          span.setAttribute('data-frenglish-key', placeholder)

          // Inject placeholder if needed
          const fullText = leadingSpace + (injectPlaceholders ? placeholder : middleText) + trailingSpace
          span.innerHTML = fullText
          textNode.parentNode?.replaceChild(span, textNode)
        }
      }
    })

    // ----- Process Translatable Attributes -----
    // For standard translatable attributes, do not modify the attribute value;
    // instead, mark the element by adding the universal data-frenglish-key.
    for (const attrName of TRANSLATABLE_ATTRIBUTES) {
      const attrValue = element.getAttribute(attrName)
      if (attrValue && attrValue !== '') {
        const placeholder = generatePlaceholder(attrValue)
        textMap[placeholder] = attrValue.trim()
        element.setAttribute('data-frenglish-key', placeholder)
        if (injectPlaceholders) {
          element.setAttribute(attrName, placeholder)
        }
      }
    }

    // ----- Process the 'value' Attribute for Buttons, Options, and Certain Inputs -----
    const valueAttr = element.getAttribute('value')
    if (valueAttr) {
      if (
        tagName === 'button' ||
        tagName === 'option' ||
        (tagName === 'input' && ['button', 'submit', 'reset'].includes(inputType))
      ) {
        const placeholder = generatePlaceholder(valueAttr)
        textMap[placeholder] = valueAttr.trim()
        element.setAttribute('data-frenglish-key', placeholder)
        if (injectPlaceholders) {
          element.setAttribute('value', placeholder)
        }
      }
    }

    // ----- Process the 'content' Attribute in <meta> Tags -----
    if (tagName === 'meta') {
      const contentAttr = element.getAttribute('content')
      if (contentAttr) {
        const metaName = (element.getAttribute('name') || '').toLowerCase()
        if (['description', 'keywords', 'author', 'og:title', 'og:description'].includes(metaName)) {
          const placeholder = generatePlaceholder(contentAttr)
          textMap[placeholder] = contentAttr.trim()
          element.setAttribute('data-frenglish-key', placeholder)
          if (injectPlaceholders) {
            element.setAttribute('content', placeholder)
          }
        }
      }
    }

    // ----- Process Data-* Attributes (e.g. data-tooltip, data-title) -----
    const dataAttributes = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .filter(attr => ['data-tooltip', 'data-title'].includes(attr.name))
    for (const attr of dataAttributes) {
      const attrValue = attr.value
      if (attrValue && attrValue !== '') {
        const placeholder = generatePlaceholder(attrValue)
        textMap[placeholder] = attrValue.trim()
        element.setAttribute('data-frenglish-key', placeholder)
        if (injectPlaceholders) {
          element.setAttribute(attr.name, placeholder)
        }
      }
    }
  }

  const modifiedHtml = doc.documentElement.outerHTML
  return {
    modifiedHtml,
    textMap,
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
  if (
    typeof window !== 'undefined' 
    && window.document 
    && !(globalThis as any).IS_UNIT_TEST)
  {
    // Browser environment
    return window.document
  }

  // Node.js environment
  try {
    const jsdomModule = await import('jsdom')
    const { JSDOM } = jsdomModule
    const dom = new JSDOM(html)
    return dom.window.document
  } catch (error) {
    throw new Error('No DOM parser available: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}