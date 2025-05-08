import pkg from 'crypto-js'
const { SHA256 } = pkg
// Only import JSDOM type, not the implementation directly at the top level for browser compatibility
import type { JSDOM as JSDOMType } from 'jsdom'
import { extractTextComponents } from './utils.js' // Assuming this utility exists
import { ExtractionResult } from '@/types/html.js' // Assuming this type exists

// ---------------------------------------------------------------------------
// Constants (Unchanged)
// ---------------------------------------------------------------------------
export const FRENGLISH_DATA_KEY = 'data-frenglish-key'

export const TRANSLATABLE_ATTRIBUTES = [
  'alt',
  'title',
  'description',
  'placeholder',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-valuetext',
  'data-tooltip',
  'data-title',
  'accesskey',
  'prompt',
  'label',
  'textarea'
]

const COLLAPSIBLE_TAGS = [
  'p', 'li', 'dt', 'dd', 'caption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'legend', 'summary', 'th', 'td', 'div'
]

// const INLINE_TAGS = new Set([
//   'span', 'strong', 'em', 'i', 'b', 'u', 'small', 'mark', 'sup', 'sub', 'br',
//   'code', 'kbd', 'samp', 'var', 'q', 'cite', 'dfn', 'abbr', 'time', 'wbr',
//   'a', 'img', 'input', 'button', 'select', 'textarea', 'label', 'picture', 'source'
// ]);

const SKIPPED_TAGS = new Set(['script', 'style', 'noscript', 'code', 'pre', 'template', 'svg'])

const HEAVY_LEAF_SELECTOR = 'script, style, iframe, video, audio, object, embed, canvas, noscript, svg, ' +
  'table, ul, ol, dl, div:not(:empty), ' + COLLAPSIBLE_TAGS.join(', ')
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function generatePlaceholder(original: string): string {
  return SHA256(original.trim()).toString()
}

function getOrInsertPlaceholder(
  rawText: string | undefined | null,
  textMap: Record<string, string>,
  injectPlaceholders: boolean
): { hash: string, newText: string; } | null {
  if (!rawText) return null

  // Extract spacing
  const { leadingSpace, middleText, trailingSpace } = extractTextComponents(rawText)
  if (!middleText) return null

  // Generate placeholder hash
  let placeholder = Object.keys(textMap).find(key => textMap[key] === middleText)
  if (!placeholder) {
    placeholder = generatePlaceholder(middleText)
    textMap[placeholder] = middleText
  }

  return {
    hash: placeholder,
    newText: leadingSpace + (injectPlaceholders ? placeholder : middleText) + trailingSpace,
  }
}

// **MODIFIED**: Returns only the Document
export async function createDocument(html: string): Promise<Document> {
  if (typeof window !== 'undefined' && window.document && !(globalThis as any).IS_UNIT_TEST) {
    // In browser environment, parse the string into a new document fragment or temporary doc
    // to avoid modifying the current window.document directly if it's not intended.
    // Simplest is often to use DOMParser.
    const parser = new window.DOMParser()
    return parser.parseFromString(html, 'text/html')
    // return window.document; // Or return current document if modification is intended
  }
  try {
    // Dynamically import JSDOM only when needed (Node.js)
    const { JSDOM } = await import('jsdom') as { JSDOM: typeof JSDOMType } // Type assertion
    const dom = new JSDOM(html)
    return dom.window.document
  } catch (err: any) {
    console.error("JSDOM loading error:", err)
    throw new Error('No DOM parser available (JSDOM failed to load): ' + err?.message)
  }
}

// **MODIFIED**: Removed NodeConsts parameter (no longer needed) and the isDivWithOnlyInline check
function shouldCollapseElement(element: Element): boolean { // Removed NodeConsts param
  const tagName = element.tagName.toLowerCase()

  if (['html', 'head', 'body', ...SKIPPED_TAGS].includes(tagName)) return false
  if (element.hasAttribute(FRENGLISH_DATA_KEY)) return false

  // Don't collapse if it contains heavy/structural elements
  if (element.querySelector(HEAVY_LEAF_SELECTOR)) {
    return false
  }

  if (tagName === 'a') {
    // strip tags inside the anchor; if any real text remains, collapse it
    const contentCheck = element.innerHTML.replace(/<[^>]+>/g, '').trim()
    return !!contentCheck      // true → collapse, false → skip
  }

  // -- special‑case: containers that are ONLY plain <a> links (e.g. nav bars)
  if (element.querySelector('a') && hasOnlyStandaloneAnchors(element, Node)) {
    return false            // don't collapse → each <a> gets its own placeholder
  }

  //  Only check if it's an explicitly collapsible tag
  const isCollapsibleTag = COLLAPSIBLE_TAGS.includes(tagName)
  if (isCollapsibleTag) {
    // Still check for meaningful content if it's a candidate tag
    const contentCheck = element.innerHTML.replace(/<[^>]+>/g, '').trim()
    return !!contentCheck
  }

  // Divs (and other non-collapsible tags) will now always return false here
  return false
}

// (Helper unchanged, except map -> textMap fix applied implicitly later)
function processNextDataValue(value: any, textMapObj: Record<string, string>, injectPlaceholders: boolean): any {
  if (typeof value === 'string') {
    const result = getOrInsertPlaceholder(value, textMapObj, injectPlaceholders)
    return result?.newText
  }

  if (Array.isArray(value)) {
    return value.map(v => processNextDataValue(v, textMapObj, injectPlaceholders))
  }

  if (value && typeof value === 'object' && value !== null) { // Added null check
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = processNextDataValue(v, textMapObj, injectPlaceholders)
    }
    return out
  }
  return value
}

function hasOnlyStandaloneAnchors(el: Element, NodeConsts: typeof Node): boolean {
  for (const n of el.childNodes) {
    if (n.nodeType === NodeConsts.TEXT_NODE) {
      if (n.textContent!.trim() !== '') return false   // real text ⇒ not nav‑only
    } else if (n.nodeType === NodeConsts.ELEMENT_NODE) {
      if ((n as Element).tagName.toLowerCase() !== 'a') return false // other tag
    }
  }
  return true // every child passed the tests
}

// ---------------------------------------------------------------------------
// Main Extraction Logic
// ---------------------------------------------------------------------------
export async function extractStrings(
  html: string,
  injectPlaceholders = true,
): Promise<ExtractionResult> {
  const textMap: Record<string, string> = {}
  const document = await createDocument(html)
  const NodeConsts = document.defaultView?.Node ?? { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 }

  function processNode(node: Node) {
    if (node.nodeType === NodeConsts.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()

      if (SKIPPED_TAGS.has(tagName)) {
        if (tagName === 'script' && element.id === '__NEXT_DATA__') {
          try {
            const json = JSON.parse(element.textContent || '{}')
            if (json.props) {
              processNextDataValue(json.props, textMap, injectPlaceholders)
              if (injectPlaceholders) {
                element.textContent = JSON.stringify(json)
              }
            }
          } catch (e) {
            console.warn(`Failed to parse or process __NEXT_DATA__ script: ${e}`)
            console.warn("Error:", e)
            // Importantly, we should still return here to stop further processing of this script tag's content
            return
          }
        }
      }

      // Skip processing children of ionicon elements
      if (element.classList && element.classList.contains('ionicon')) {
        processAttributes(element)
        return
      }

      if (shouldCollapseElement(element)) {
        const result = getOrInsertPlaceholder(element.innerHTML, textMap, injectPlaceholders)
        if (!result) return
        element.setAttribute(FRENGLISH_DATA_KEY, result.hash)
        element.innerHTML = result.newText
        processAttributes(element)
        return
      } else {
        processAttributes(element)
        Array.from(element.childNodes).forEach(processNode)
      }
    } else if (node.nodeType === NodeConsts.TEXT_NODE) {
      const parent = node.parentElement
      if (!parent) {
        return
      }

      const tag = parent.tagName.toLowerCase()
      const textContent = node.textContent?.trim()

      if (!textContent) {
        return
      }

      if (
        parent.hasAttribute(FRENGLISH_DATA_KEY) ||
        SKIPPED_TAGS.has(tag) ||
        tag === 'textarea' ||
        (tag === 'input' && !['button', 'submit', 'reset'].includes(parent.getAttribute('type')?.toLowerCase() || ''))
      ) {
        return
      }

      const result = getOrInsertPlaceholder(node.textContent, textMap, injectPlaceholders)
      if (result) {
        const span = document.createElement('span')
        span.setAttribute(FRENGLISH_DATA_KEY, result.hash)
        span.textContent = result.newText
        try {
          parent.replaceChild(span, node)
        } catch (e) {
          console.warn(`Could not replace text node with span in parent <${parent.tagName}>. Error: ${e}`)
        }
      }
    }
  }

  function processAttributes(element: Element) {
    const tagName = element.tagName.toLowerCase()

    for (const attrName of TRANSLATABLE_ATTRIBUTES) {
      const attrValue = element.getAttribute(attrName)
      if (attrValue) {
        const result = getOrInsertPlaceholder(attrValue, textMap, injectPlaceholders)
        if (result) {
          element.setAttribute(attrName, result.newText)
        }
      }
    }

    const valAttr = element.getAttribute('value')
    const inputType = element.getAttribute('type')?.toLowerCase() || ''
    if (valAttr && (tagName === 'button' || tagName === 'option' || (tagName === 'input' && ['button', 'submit', 'reset'].includes(inputType)))) {
      const result = getOrInsertPlaceholder(valAttr, textMap, injectPlaceholders)
      if (result) {
        element.setAttribute('value', result.newText)
      }
    }

    if (tagName === 'meta') {
      const contentAttr = element.getAttribute('content')
      if (contentAttr) {
        const metaName = (element.getAttribute('name') || element.getAttribute('property') || '').toLowerCase()
        if (['description', 'keywords', 'author', 'og:title', 'og:description', 'twitter:title', 'twitter:description', 'application-name'].includes(metaName)) {
          const result = getOrInsertPlaceholder(contentAttr, textMap, injectPlaceholders)

          if (result) {
            element.setAttribute('content', result.newText)
          }
        }
      }
    }

    if (tagName === 'title' && !element.hasAttribute(FRENGLISH_DATA_KEY)) {
      const result = getOrInsertPlaceholder(element.textContent, textMap, injectPlaceholders)
      if (result) {
        element.setAttribute(FRENGLISH_DATA_KEY, result.hash)
        element.textContent = result.newText
      }
    }
  }

  if (document.head) {
    Array.from(document.head.childNodes).forEach(processNode)
  }
  if (document.body) {
    Array.from(document.body.childNodes).forEach(processNode)
  }

  const finalMap: Record<string, string> = {}
  for (const [key, value] of Object.entries(textMap)) {
    if (value) {
      finalMap[key] = value
    }
  }

  return {
    modifiedHtml: document.documentElement.outerHTML,
    textMap: finalMap,
  }
}