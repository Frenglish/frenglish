// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
import pkg from 'crypto-js'
import type { JSDOM as JSDOMType } from 'jsdom'
import { extractTextComponents } from './utils.js'
import { ExtractionResult } from '@/types/html.js'

const { SHA256 } = pkg

if (typeof window === 'undefined') {
  global.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    // Add other node types if needed
  } as any
}

export const FRENGLISH_DATA_KEY = 'data-frenglish-key'

// Attributes we replace with placeholders
export const TRANSLATABLE_ATTRIBUTES = new Set([
  'alt', 'title', 'description', 'placeholder',
  'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-valuetext',
  'data-tooltip', 'data-title', 'accesskey', 'prompt', 'label', 'textarea',
])

// – Tags whose inner‑text blobs we may collapse as a single placeholder
const COLLAPSIBLE_TAGS = [
  'p', 'li', 'dt', 'dd', 'caption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'legend', 'summary', 'th', 'td', 'div',
]
const COLLAPSIBLE_SET = new Set(COLLAPSIBLE_TAGS)

// – If a container’s children are *only* these tags (and no text),
//   treat children individually instead of collapsing the parent
const ATOMIC_CHILD_SET = new Set([
  'label', 'input', 'textarea', 'button', 'select', 'option',
  'img', 'a', 'picture', 'source',
])

// – Tags (and matching <script> / <style>) that we *never* walk for text
const SKIPPED_TAGS = new Set(['script', 'style', 'noscript', 'code', 'pre', 'template', 'svg'])

// – Heavy / structural nodes that force a parent not to collapse
const HEAVY_LEAF_SELECTOR =
  'script,style,iframe,video,audio,object,embed,canvas,noscript,svg,' +
  'table,ul,ol,dl,div:not(:empty),' + COLLAPSIBLE_TAGS.join(',')

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
const generatePlaceholder = (txt: string) => SHA256(txt.trim()).toString()

type TextMaps = { forward: Record<string, string>; reverse: Record<string, string> }

function upsertPlaceholder(raw: string | undefined | null, maps: TextMaps, inject: boolean) {
  if (!raw) return null
  const { leadingSpace, middleText, trailingSpace } = extractTextComponents(raw)
  if (!middleText) return null

  let hash = maps.reverse[middleText]
  if (!hash) {
    hash = generatePlaceholder(middleText)
    maps.forward[hash] = middleText
    maps.reverse[middleText] = hash
  }
  return {
    hash,
    newText: leadingSpace + (inject ? hash : middleText) + trailingSpace,
  }
}

export async function createDocument(html: string): Promise<Document> {
  if (typeof window !== 'undefined' && window.document && !(globalThis as any).IS_UNIT_TEST) {
    return window.document
  }
  const { JSDOM } = (await import('jsdom')) as { JSDOM: typeof JSDOMType }
  return new JSDOM(html).window.document
}

// ---------------------------------------------------------------------------
// Node‑level guards
// ---------------------------------------------------------------------------
const isAtomicContainer = (el: Element) => {
  if (!el.firstChild) return false
  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE && n.textContent!.trim()) return false
    if (n.nodeType === Node.ELEMENT_NODE && !ATOMIC_CHILD_SET.has((n as Element).tagName.toLowerCase())) return false
  }
  return true
}

const shouldCollapse = (el: Element) => {
  const tag = el.tagName.toLowerCase()
  if (tag === 'html' || tag === 'head' || tag === 'body' || SKIPPED_TAGS.has(tag)) return false
  if (el.hasAttribute(FRENGLISH_DATA_KEY)) return false
  if (el.querySelector(HEAVY_LEAF_SELECTOR)) return false
  if (isAtomicContainer(el)) return false
  if (tag === 'a' || COLLAPSIBLE_SET.has(tag)) return !!el.textContent?.trim()
  return false
}

// ---------------------------------------------------------------------------
// Recursive processors
// ---------------------------------------------------------------------------
function processAttributes(el: Element, maps: TextMaps, inject: boolean) {
  const tag = el.tagName.toLowerCase()

  TRANSLATABLE_ATTRIBUTES.forEach(attr => {
    const val = el.getAttribute(attr)
    if (!val?.trim()) return
    const rep = upsertPlaceholder(val, maps, inject)
    if (rep) el.setAttribute(attr, rep.newText)
  })

  // value="…" on buttons / inputs
  const valAttr = el.getAttribute('value')
  const type = el.getAttribute('type')?.toLowerCase() ?? ''
  if (
    valAttr &&
    (tag === 'button' || tag === 'option' || (tag === 'input' && ['button', 'submit', 'reset'].includes(type)))
  ) {
    const rep = upsertPlaceholder(valAttr, maps, inject)
    if (rep) el.setAttribute('value', rep.newText)
  }

  // <meta>
  if (tag === 'meta') {
    const content = el.getAttribute('content')
    if (!content) return
    const name = (el.getAttribute('name') || el.getAttribute('property') || '').toLowerCase()
    if (
      [
        'description',
        'keywords',
        'author',
        'og:title',
        'og:description',
        'twitter:title',
        'twitter:description',
        'application-name',
      ].includes(name)
    ) {
      const rep = upsertPlaceholder(content, maps, inject)
      if (rep) el.setAttribute('content', rep.newText)
    }
    return
  }

  // <title>
  if (tag === 'title' && !el.hasAttribute(FRENGLISH_DATA_KEY)) {
    const rep = upsertPlaceholder(el.textContent, maps, inject)
    if (rep) {
      el.setAttribute(FRENGLISH_DATA_KEY, rep.hash)
      el.textContent = rep.newText
    }
  }
}

function processDataValue(val: any, maps: TextMaps, inject: boolean): any {
  if (typeof val === 'string') return upsertPlaceholder(val, maps, inject)?.newText
  if (Array.isArray(val)) return val.map(v => processDataValue(v, maps, inject))
  if (val && typeof val === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(val)) out[k] = processDataValue(v, maps, inject)
    return out
  }
  return val
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function extractStrings(html: string, injectPlaceholders = true): Promise<ExtractionResult> {
  const maps: TextMaps = { forward: {}, reverse: {} }
  const doc = await createDocument(html)
  const NodeConsts = doc.defaultView?.Node ?? { ELEMENT_NODE: 1, TEXT_NODE: 3 }

  const walk = (node: Node): void => {
    if (node.nodeType === NodeConsts.ELEMENT_NODE) {
      const el = node as Element
      const tag = el.tagName.toLowerCase()

      if (SKIPPED_TAGS.has(tag)) {
        if (tag === 'script' && el.id === '__NEXT_DATA__') {
          try {
            const json = JSON.parse(el.textContent || '{}')
            if (json.props) {
              processDataValue(json.props, maps, injectPlaceholders)
              if (injectPlaceholders) el.textContent = JSON.stringify(json)
            }
          } catch {
            /* swallow malformed JSON */
          }
        }
        return
      }

      if (el.classList.contains('ionicon')) {
        processAttributes(el, maps, injectPlaceholders)
        return
      }

      if (node.parentElement?.hasAttribute(FRENGLISH_DATA_KEY)) {
        return
      }

      if (shouldCollapse(el)) {
        const rep = upsertPlaceholder(el.innerHTML, maps, injectPlaceholders)
        if (rep) {
          el.setAttribute(FRENGLISH_DATA_KEY, rep.hash)
          el.innerHTML = rep.newText
          processAttributes(el, maps, injectPlaceholders)
        }
        return
      }

      processAttributes(el, maps, injectPlaceholders)
      el.childNodes.forEach(walk)
      return
    }

    if (node.nodeType === NodeConsts.TEXT_NODE) {
      const parent = node.parentElement
      if (!parent || !node.textContent?.trim()) return
      const pTag = parent.tagName.toLowerCase()
      if (
        parent.hasAttribute(FRENGLISH_DATA_KEY) ||
        SKIPPED_TAGS.has(pTag) ||
        pTag === 'textarea' ||
        (pTag === 'input' && !['button', 'submit', 'reset'].includes(parent.getAttribute('type')?.toLowerCase() || ''))
      )
        return

      const rep = upsertPlaceholder(node.textContent, maps, injectPlaceholders)
      if (rep) {
        const span = doc.createElement('span')
        span.setAttribute(FRENGLISH_DATA_KEY, rep.hash)
        span.textContent = rep.newText
        parent.replaceChild(span, node)
      }
    }
  }

  doc.head && doc.head.childNodes.forEach(walk)
  doc.body && doc.body.childNodes.forEach(walk)

  return { modifiedHtml: doc.documentElement.outerHTML, textMap: maps.forward }
}

// Sets HTML element language
export function setDocumentLang(doc: Document, lang?: string) {
  if (!lang || !lang.trim()) return
  const htmlEl = doc.documentElement
  if (htmlEl.getAttribute('lang') !== lang) {
    htmlEl.setAttribute('lang', lang)
  }
}

/**
 * Modify HTMl overrides like directionality (rtl vs ltl), language html attribute, etc.
 */
export function injectHTMLOverwrite(doc: Document, language?: string) {
  // Adjust directionality
  if (language && languageReadingDirection(language) === 'rtl') {
    doc.documentElement.setAttribute('dir', 'rtl')
    const style = doc.createElement('style')
    style.textContent = 'body, body * { dir: rtl; text-align: right; }'
    doc.head.appendChild(style)
  }
  // Modify HTML attribute language
  setDocumentLang(doc, language)
}

/**
 * Determines if a BCP‑47 language code should be rendered RTL or LTR.
 */
export function languageReadingDirection(lang: string): 'rtl' | 'ltr' {
  const rtl = ['ar', 'he', 'fa', 'ur', 'yi', 'dv', 'ha', 'ps']
  return rtl.includes(lang.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr'
}