// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
import pkg from 'crypto-js'
import type { JSDOM as JSDOMType,  VirtualConsole as VirtualConsoleType } from 'jsdom'
import { extractTextComponents } from './utils.js'
import { CompressionResult, ExtractionResult, MasterStyleMap, OriginalTagInfo } from '../types/html.js'
import { Configuration } from '../types/configuration.js'
import { FlatJSON } from '../types/translation.js'

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

// – If a container's children are *only* these tags (and no text),
//   treat children individually instead of collapsing the parent
const ATOMIC_CHILD_SET = new Set([
  'label', 'input', 'textarea', 'button', 'select', 'option',
  'img', 'a', 'picture', 'source',
])

// – Tags (and matching <script> / <style>) that we *never* walk for text
export const SKIPPED_TAGS = new Set(['script', 'style', 'noscript', 'code', 'pre', 'template', 'svg'])

// – Heavy / structural nodes that force a parent not to collapse
const HEAVY_LEAF_SELECTOR =
  'script,style,iframe,video,audio,object,embed,canvas,noscript,svg,' +
  'table,ul,ol,dl,div:not(:empty),' + COLLAPSIBLE_TAGS.join(',')

export const PLACEHOLDER_TAG_RE = /<(?:sty|href|excl)\d+\b[^>]*>/i;
// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
const generatePlaceholder = (txt: string) => SHA256(txt.trim()).toString()

export type TextMaps = { forward: Record<string, string>; reverse: Record<string, string> }

async function upsertPlaceholder(raw: string | undefined | null, maps: TextMaps, inject: boolean, config: Configuration, compress: boolean, masterStyleMap: MasterStyleMap) {
  if (!raw) return null
  const { leadingSpace, middleText, trailingSpace } = extractTextComponents(raw)
  if (!middleText) return null

  let compressedMiddleTextString: string
  if (compress) {
    const compressedMiddleText = await getCompressedInLineWithStyleMap(middleText, config, masterStyleMap)
    compressedMiddleTextString = compressedMiddleText
  } else {
    compressedMiddleTextString = unescapeHtml(middleText)
  }
  
  const PH_TAG_RE = /<(\/?)(sty|href|excl)(\d+)([^>]*)>/gi;
  compressedMiddleTextString = compressedMiddleTextString.replace(
    PH_TAG_RE,
    (
      _full: string,
      slash: string = '',
      prefix: string,
      num: string,
      rest: string = ''
    ) => `<${slash}${prefix.toLowerCase()}${num}${rest}>`
  );

  let hash = maps.reverse[compressedMiddleTextString]
  if (!hash) {
    hash = generatePlaceholder(compressedMiddleTextString)
    maps.forward[hash] = compressedMiddleTextString
    maps.reverse[compressedMiddleTextString] = hash
  }
  return {
    hash,
    newText: leadingSpace + (inject ? hash : compressedMiddleTextString) + trailingSpace,
  }
}

export async function createDocument(html: string): Promise<Document> {
  // Import JSDOM and VirtualConsole
  const { JSDOM, VirtualConsole } = (await import('jsdom')) as { JSDOM: typeof JSDOMType, VirtualConsole: typeof VirtualConsoleType };

  const virtualConsole = new VirtualConsole();

  // Listen for the generic 'jsdomError' event, which is type-safe.
  virtualConsole.on('jsdomError', (e) => {
    // Inside the handler, check if the error message is the one we want to suppress.
    if (e.message.includes('Could not parse CSS stylesheet')) {
      // If it is, simply return and do nothing, effectively silencing the error.
      return;
    }
  });

  // Pass the configured virtual console in the JSDOM options
  const dom = new JSDOM(html, {
    virtualConsole,
  });

  return dom.window.document;
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

export const shouldCollapse = (el: Element) => {
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
async function processAttributes(el: Element, maps: TextMaps, inject: boolean, config: Configuration, compress: boolean, injectDataKey: boolean, masterStyleMap: MasterStyleMap) {
  const tag = el.tagName.toLowerCase()

  if (tag === 'title') {
    return // ✅ skip entirely because <title> is handled separately
  }

  for (const attr of TRANSLATABLE_ATTRIBUTES) {
    const val = el.getAttribute(attr)
    if (!val?.trim()) continue
    const rep = await upsertPlaceholder(val, maps, inject, config, compress, masterStyleMap)
    if (rep) el.setAttribute(attr, rep.newText)
  }

  // value="…" on buttons / inputs
  const valAttr = el.getAttribute('value')
  const type = el.getAttribute('type')?.toLowerCase() ?? ''
  if (
    valAttr &&
    (tag === 'button' || tag === 'option' || (tag === 'input' && ['button', 'submit', 'reset'].includes(type)))
  ) {
    const rep = await upsertPlaceholder(valAttr, maps, inject, config, compress, masterStyleMap)
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
      const rep = await upsertPlaceholder(content, maps, inject, config, compress, masterStyleMap)
      if (rep) el.setAttribute('content', rep.newText)
    }
    return
  }

  // <title>
  if (tag === 'title' && !el.hasAttribute(FRENGLISH_DATA_KEY)) {
    const rep = await upsertPlaceholder(el.textContent, maps, inject, config, compress, masterStyleMap)
    if (rep) {
      if (injectDataKey) el.setAttribute(FRENGLISH_DATA_KEY, rep.hash)
      el.textContent = rep.newText
    }
  }
}

async function processDataValue(val: any, maps: TextMaps, inject: boolean, config: Configuration, compress: boolean, masterStyleMap: MasterStyleMap): Promise<any> {
  if (typeof val === 'string') {
    const rep = await upsertPlaceholder(val, maps, inject, config, compress, masterStyleMap)
    return rep?.newText
  }
  if (Array.isArray(val)) return Promise.all(val.map(v => processDataValue(v, maps, inject, config, compress, masterStyleMap)))
  if (val && typeof val === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(val)) out[k] = await processDataValue(v, maps, inject, config, compress, masterStyleMap)
    return out
  }
  return val
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function extractStrings(
  html: string,
  injectPlaceholders = true,
  config: Configuration,
  compress = true,
  injectDataKey = true
): Promise<ExtractionResult & { styleMap: MasterStyleMap }> {
  const maps: TextMaps = { forward: {}, reverse: {} }
  const masterStyleMap:  MasterStyleMap  = {}
  const doc = await createDocument(html)
  const NodeConsts = doc.defaultView?.Node ?? { ELEMENT_NODE: 1, TEXT_NODE: 3 }

  const walk = async (node: Node): Promise<void> => {
    if (node.nodeType === NodeConsts.ELEMENT_NODE) {
      const el = node as Element
      const tag = el.tagName.toLowerCase()

      if (SKIPPED_TAGS.has(tag)) {
        if (tag === 'script' && el.id === '__NEXT_DATA__') {
          try {
            const json = JSON.parse(el.textContent || '{}')
            if (json.props) {
              await processDataValue(json.props, maps, injectPlaceholders, config, compress, masterStyleMap)
              if (injectPlaceholders) el.textContent = JSON.stringify(json)
            }
          } catch {
            /* swallow malformed JSON */
          }
        }
        return
      }

      if (el.classList.contains('ionicon')) {
        await processAttributes(el, maps, injectPlaceholders, config, compress, injectDataKey, masterStyleMap)
        return
      }

      if (node.parentElement?.hasAttribute(FRENGLISH_DATA_KEY)) {
        return
      }

      if (shouldCollapse(el)) {
        const rep = await upsertPlaceholder(el.innerHTML, maps, injectPlaceholders, config, compress, masterStyleMap)
        if (rep) {
          if (injectDataKey) el.setAttribute(FRENGLISH_DATA_KEY, rep.hash)
          el.innerHTML = rep.newText
          await processAttributes(el, maps, injectPlaceholders, config, compress, injectDataKey, masterStyleMap)
        }
        return
      }

      await processAttributes(el, maps, injectPlaceholders, config, compress, injectDataKey, masterStyleMap)

      // recursive
      for (const child of el.childNodes) {
        await walk(child)
      }
      return
    }

    if (node.nodeType === NodeConsts.TEXT_NODE) {
      const parent = node.parentElement
      if (!parent || !node.textContent?.trim()) return
      const pTag = parent.tagName.toLowerCase()

      // special handling for <title>
      if (pTag === 'title') {
        const rep = await upsertPlaceholder(node.textContent, maps, injectPlaceholders, config, compress, masterStyleMap)
        if (rep) {
          if (injectDataKey) parent.setAttribute(FRENGLISH_DATA_KEY, rep.hash)
          node.textContent = rep.newText
        }
        return
      }

      if (
        parent.hasAttribute(FRENGLISH_DATA_KEY) ||
        SKIPPED_TAGS.has(pTag) ||
        pTag === 'textarea' ||
        (pTag === 'input' && !['button', 'submit', 'reset'].includes(parent.getAttribute('type')?.toLowerCase() || ''))
      ) {
        return
      }

      const rep = await upsertPlaceholder(node.textContent, maps, injectPlaceholders, config, compress, masterStyleMap)
      if (rep) {
        const span = doc.createElement('span')
        if (injectDataKey) span.setAttribute(FRENGLISH_DATA_KEY, rep.hash)
        span.textContent = rep.newText
        parent.replaceChild(span, node)
      }
    }
  }

  // process head and body
  if (doc.head) {
    for (const node of doc.head.childNodes) {
      await walk(node)
    }
  }
  if (doc.body) {
    for (const node of doc.body.childNodes) {
      await walk(node)
    }
  }

  return {
    modifiedHtml: doc.documentElement.outerHTML,
    textMap: maps.forward,
    styleMap: masterStyleMap,
  }
}

async function getCompressedInLineWithStyleMap(
  htmlChunk: string,
  config:   Configuration,
  map:      MasterStyleMap
): Promise<string> {
  const { compressed, styleMap, hrefMap } =
          await compressInlineStyling(htmlChunk, config)

  const hash = SHA256(compressed).toString()
  map[hash]  = { styleMap, hrefMap }
  return compressed
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

// -----------------------------------------------------------------------------
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  INLINE‑STYLING COMPRESSION / DECOMPRESSION                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// -----------------------------------------------------------------------------

/**
 * Decompresses a string that contains either <STYm>…</STYm>
 * **or** <HREFm>…</HREFm> placeholders or similar
 */
export function decompressHTML(
  compressedString: string,
  styleMap: Record<string, OriginalTagInfo>,
  hrefMap: Record<string, string> = {},
): string {
  let out = compressedString

  // Compression wrappers: hrefs, styling and exclusions
  // Updated RE to match generic placeholders like <STY0>, <HREF0>, <EXCL0>
  const RE = /<((?:sty|href|excl)\d+)([^>]*)>(?:([\s\S]*?)<\/\1>)?/gi

  out = out.replace(RE, (m, phTag, newAttrs, content) => {
    const info = styleMap[phTag]
    if (!info) return m

    /* 1️⃣ parse any attrs the translator left on the tag */
    const parsed = Object.fromEntries(
      [...newAttrs.matchAll(/\s+([^\s=]+)="([^"]*)"/g)]
        .map(([, k, v]) => [k, v])
    )

    /* 2️⃣ merge: translator wins over original */
    const final: Record<string, string> = { ...info.attributes, ...parsed }

    /* 3️⃣ serialize */
    let attrString = ''
    for (const [k, v] of Object.entries(final)) {
      attrString += ` ${k}="${escapeAttribute(v)}"`
    }

    // Handle self-closing elements
    const selfClosingTags = ['input', 'img', 'br', 'hr', 'meta', 'link', 'wbr', 'area', 'base', 'col', 'embed', 'param', 'source', 'track']
    if (selfClosingTags.includes(info.tagName.toLowerCase())) {
      return `<${info.tagName.toLowerCase()}${attrString}>`
    }

    return `<${info.tagName.toLowerCase()}${attrString}>${content || ''}</${info.tagName.toLowerCase()}>`
  })

  // run repeatedly so we handle nested placeholders in one call
  let prev: string
  let pass = 0
  do {
    if (++pass > 20) break
    prev = out
    out = out.replace(RE, (m, phTag, _attrs, content) => {
      const info = styleMap[phTag]
      if (!info) return m
      let attrs = ''
      for (const [k, v] of Object.entries(info.attributes)) {
        attrs += ` ${k}="${escapeAttribute(v)}"`
      }

      // Handle self-closing elements
      const selfClosingTags = ['input', 'img', 'br', 'hr', 'meta', 'link']
      if (selfClosingTags.includes(info.tagName.toLowerCase())) {
        return `<${info.tagName.toLowerCase()}${attrs}>`
      }

      return `<${info.tagName.toLowerCase()}${attrs}>${content || ''}</${info.tagName.toLowerCase()}>`
    })
  } while (out !== prev)

  /* ── 2️⃣  Restore href=\"HREF…\" attribute values  ────────────────────── */
  out = restoreHrefs(out, hrefMap)

  /* ── 3️⃣  Cosmetic: force lowercase tag-names written by jsdom  ───────── */
  return out.replace(/<\/?([A-Z]+)/g, m => m.toLowerCase())
}

/**
 * Compresses every **FlatJSON.value** that contains inline HTML. All other
 * values are kept intact. The original array order is preserved.
 *
 * @param originalFlatJson array of FlatJSON items to scan
 * @param collectMaps      whether to build a master style‑map for later restore
 */
export async function compressHTMLTextMapValues(
  originalFlatJson: FlatJSON[],
  config: Configuration
): Promise<{ compressed: FlatJSON[]; styleMap: MasterStyleMap }> {
  const compressed: FlatJSON[] = []
  const masterStyleMap: MasterStyleMap = {}
  const htmlish = /<[a-z][\s\S]*>/i

  for (let i = 0; i < originalFlatJson.length; i++) {
    const item = originalFlatJson[i]
    if (typeof item.value === 'string' && htmlish.test(item.value)) {
      const { compressed: cmp, styleMap, hrefMap } = await compressInlineStyling(item.value, config)
      const compressedValueHash = SHA256(cmp).toString();

      compressed.push({ ...item, value: cmp })
      masterStyleMap[compressedValueHash] = { styleMap, hrefMap }

    } else {
      compressed.push(item)
    }
  }

  return {
    compressed,
    styleMap: masterStyleMap
  };
}

// -----------------------------------------------------------------------------
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  DEFAULTS                                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// -----------------------------------------------------------------------------

const DEFAULT_EXCLUDED_ELEMENTS = '.no-translate'

// -----------------------------------------------------------------------------
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  COMPRESSION / DECOMPRESSION HELPERS                                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// -----------------------------------------------------------------------------

/**
 * Convenience wrapper around compressHTML() for a single HTML fragment.
 */
async function compressInlineStyling(htmlChunk: string, config: Configuration) {
  const doc = await getSharedDoc()
  const { compressedString, styleMap, hrefMap } = compressHTML(htmlChunk, doc, config)
  return { compressed: compressedString, styleMap, hrefMap }
}

// cache a single document after the first call
let sharedDocPromise: Promise<Document> | null = null
async function getSharedDoc(): Promise<Document> {
  if (!sharedDocPromise) {
    sharedDocPromise = createDocument('<body></body>')
  }
  return sharedDocPromise
}

/**
 * Walks a small HTML fragment, replacing inline‑formatting tags (<span>,
 * <strong>, …) with neutral <styling_N> placeholders. A style map records the
 * original tag + attributes so the fragment can later be reconstructed.
 */
function compressHTML(
  htmlChunk: string,
  doc: Document,
  config: Configuration // Removed prefix parameter
): CompressionResult {
  const styleMap: { [ph: string]: OriginalTagInfo } = {}
  const hrefMap: { [ph: string]: string } = {}
  let counter = 0
  let hrefCounter = 0
  const container = doc.createElement('div')
  container.innerHTML = htmlChunk

  function walk(n: Node): string {
    switch (n.nodeType) {
      case Node.TEXT_NODE:
        return unescapeHtml(n.textContent || '')
      case Node.ELEMENT_NODE: {
        const el = n as Element
        const tagName = el.tagName.toLowerCase()

        if (tagName === 'br' || tagName === 'hr' || tagName === 'wbr' || tagName === 'area' || tagName === 'base' || tagName ==='col'
          || tagName === 'embed' || tagName === 'param' || tagName === 'source' || tagName === 'track') {
          const ph = `sty${counter++}`
          styleMap[ph] = {
            tagName,
            attributes: Object.fromEntries([...el.attributes].map(a => [a.name, a.value])),
          }
          return `<${ph}>`
        }

        // Compressing hrefs
        if (el.tagName.toLowerCase() === 'a') {
          // Generate generic placeholder without prefix
          const ph = `href${hrefCounter++}`

          // 1️⃣ Collect attributes for later restore
          const restoreAttrs: Record<string, string> = { href: ph }

          // 2️⃣ Build the *visible* attribute string – only translatable ones!
          let attrString = ''
          Array.from(el.attributes).forEach(({ name, value }) => {
            if (name === 'href') {
              hrefMap[ph] = value                         // <-- keep original URL
            } else {
              restoreAttrs[name] = value                  // <-- keep everything
              if (TRANSLATABLE_ATTRIBUTES.has(name)) {
                attrString += ` ${name}="${escapeAttribute(value)}"`
              }
            }
          })

          styleMap[ph] = { tagName: 'a', attributes: restoreAttrs }

          // 3️⃣ Recurse into children
          let inner = ''
          el.childNodes.forEach(c => inner += walk(c))
          return `<${ph}${attrString}>${inner}</${ph}>`
        }

        // Compressing form elements
        const formElements = ['input', 'label', 'textarea', 'button', 'form']
        if (formElements.includes(el.tagName.toLowerCase())) {
          // Generate generic placeholder without prefix
          const ph = `sty${counter++}`
          const attrs: Record<string, string> = {}

          // Build the visible attribute string for translatable attributes
          let attrString = ''
          Array.from(el.attributes).forEach(a => {
            // Keep all attributes in the styleMap for restoration
            attrs[a.name] = a.value

            // Only show translatable attributes in the compressed output
            if (TRANSLATABLE_ATTRIBUTES.has(a.name)) {
              attrString += ` ${a.name}="${escapeAttribute(a.value)}"`
            }
          })

          styleMap[ph] = { tagName: el.tagName, attributes: attrs }

          // For self-closing elements like input, don't process children
          if (['input'].includes(el.tagName.toLowerCase())) {
            return `<${ph}${attrString}>`
          }

          // For other form elements, keep text content uncompressed
          let inner = ''
          el.childNodes.forEach(c => {
            if (c.nodeType === Node.TEXT_NODE) {
              // Keep text content as-is for translation
              inner += c.textContent || ''
            } else {
              // Process other nodes normally
              inner += walk(c)
            }
          })
          return `<${ph}${attrString}>${inner}</${ph}>`
        }

        // Compressing no-translate and such ()
        const excludedBlocks = config.excludedTranslationBlocks
        const excluded = el.matches?.(DEFAULT_EXCLUDED_ELEMENTS) ||
          (excludedBlocks?.some(block =>
            Array.isArray(block.blocks) &&
            block.blocks.some(item => el.matches?.(item.selector))
          ))

        if (excluded) {
          // Generate generic placeholder without prefix
          const ph = `excl${counter++}`
          styleMap[ph] = { tagName: el.tagName, attributes: Object.fromEntries([...el.attributes].map(a => [a.name, a.value])) }

          let inner = ''
          el.childNodes.forEach(c => inner += walk(c))
          return `<${ph}>${inner}</${ph}>`
        }

        if (el.tagName.toLowerCase() === 'img') {
          // Generate generic placeholder without prefix
          const ph = `sty${counter++}` // Using STY prefix, or could be IMG
          const restoreAttrs: Record<string, string> = {}
          let displayAttrsString = '' // Attributes visible to the translator

          Array.from(el.attributes).forEach(attr => {
            restoreAttrs[attr.name] = attr.value // Store ALL original attributes for restoration

            // Only include TRANSLATABLE attributes (like alt, title) in the display string
            if (TRANSLATABLE_ATTRIBUTES.has(attr.name.toLowerCase())) {
              displayAttrsString += ` ${attr.name}="${escapeAttribute(attr.value)}"`
            }
          })

          styleMap[ph] = { tagName: 'img', attributes: restoreAttrs }

          // Return a self-closing placeholder with only translatable attributes
          return `<${ph}${displayAttrsString}>`
        }

        if (isCompressibleInlineElement(el)) {
          // Generate generic placeholder without prefix
          const ph = `sty${counter++}`
          const attrs: Record<string, string> = {}
          Array.from(el.attributes).forEach(a => {
            if (a.name === 'href') {
              // Generate generic placeholder for href
              const hrefPh = `href${hrefCounter++}`
              hrefMap[hrefPh] = a.value
              attrs[a.name] = hrefPh
            } else {
              attrs[a.name] = a.value
            }
          })

          styleMap[ph] = { tagName: el.tagName, attributes: attrs }
          let inner = ''
          el.childNodes.forEach(c => (inner += walk(c)))
          return `<${ph}>${inner}</${ph}>`
        }
        let inner = ''
        el.childNodes.forEach(c => (inner += walk(c)))
        const tag = el.tagName.toLowerCase()
        let attrs = ''
        Array.from(el.attributes).forEach(a => {
          if (a.name === 'href') {
            const hrefPh = `__HREF_${hrefCounter++}__` // This is a different placeholder type, keep as is for now
            hrefMap[hrefPh] = a.value
            attrs += ` href="${hrefPh}"`
          } else {
            attrs += ` ${a.name}="${escapeAttribute(a.value)}"`
          }
        })
        const selfClose = ['br', 'hr', 'img', 'input', 'meta', 'link', 'wbr', 'area', 'base', 'col', 'embed', 'param', 'source', 'track']
        return selfClose.includes(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>${inner}</${tag}>`
      }
      default:
        return ''
    }
  }

  let compressed = ''
  container.childNodes.forEach(c => (compressed += walk(c)))
  return { compressedString: compressed, styleMap, hrefMap }
}

/**
 * Returns true if the element is a simple inline formatter that can be safely
 * replaced by a placeholder (<strong>, <span>, …).
 */
function isCompressibleInlineElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase()
  return new Set([
    'span', 'strong', 'em', 'i', 'b', 'u', 'sub', 'sup', 'mark', 'small', 'font', 'code',
    'abbr','cite','bdi','bdo','del','ins','kbd','q','samp','var'
  ]).has(tag)
}

/**
 * Restores **all** href placeholders, regardless of any user-supplied
 * prefix that was prepended in compressInlineStyling().
 *
 * (Using plain RegExp back-references proved too fragile once prefixes
 * grew more complex, so we now simply stream-replace from the known map.)
 */
function restoreHrefs(html: string, hrefMap: Record<string, string>) {
  for (const [ph, url] of Object.entries(hrefMap)) {
    // the placeholder may occur several times → global replace
    html = html.split(ph).join(escapeAttribute(url))
  }
  return html
}

/** Escapes attribute values when reconstructing decompressed HTML. */
function escapeAttribute(v: string): string {
  if (!v) return '';
  return v
    .replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;') // &#39; is more universally compatible than &apos;
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Decodes common HTML entities to create a plain text representation.
 * This is crucial for normalization before hashing.
 * The order of replacement is important: &amp; must be first.
 */
function unescapeHtml(v: string): string {
    if (!v) return '';
    return v
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function shouldEscape(str: string): boolean {
  // Matches <STY0>, <HREF1>, <EXCL2>, etc.
  return !/<(?:sty|href|excl)\d+>/i.test(str);
}