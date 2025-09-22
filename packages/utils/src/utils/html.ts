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

const DO_NOT_COLLAPSE_CLASSES = new Set([
  // --- Navigation & Interactive ---
  'awb-menu__li',
  'awb-submenu__li',
  'menu-item',
  'breadcrumb',
  'pagination',
  'page-numbers',
  'tab',
  // --- Layout & Grid (Page Builders) ---
  'card',
  'col',
  'column',
  'fusion-builder-column',
  'fusion-layout-column',
  'elementor-widget-container',
  'pricing-table',
  // --- Widgets & Modules ---
  'slide',
  'carousel-item',
  'swiper-slide',
  'accordion-item',
  'testimonial',
  'modal',
  // --- Forms ---
  'form-group',
  'form-row',
]);

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
  // IMPORTANT: Do not remove this because this cannot load in the frontend.
  if (typeof window !== 'undefined' && window.document && !(globalThis as any).IS_UNIT_TEST) {
    return window.document
  }
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
  for (const className of DO_NOT_COLLAPSE_CLASSES) {
    if (el.classList.contains(className)) {
      return false;
    }
  }

  if (Array.from(el.classList).some(cls => cls.startsWith('col-') || cls.startsWith('wp-block-'))) {
    return false;
  }

  const tag = el.tagName.toLowerCase();
  if (tag === 'html' || tag === 'head' || tag === 'body' || SKIPPED_TAGS.has(tag)) return false;
  if (el.hasAttribute(FRENGLISH_DATA_KEY)) return false;
  if (el.querySelector(HEAVY_LEAF_SELECTOR)) return false;
  if (isAtomicContainer(el)) return false;
  if (tag === 'a' || COLLAPSIBLE_SET.has(tag)) return !!el.textContent?.trim();
  return false;
};

// ---------------------------------------------------------------------------
// Recursive processors
// ---------------------------------------------------------------------------
async function processAttributes(
  el: Element,
  maps: TextMaps,
  inject: boolean,
  config: Configuration,
  compress: boolean,
  injectDataKey: boolean,
  masterStyleMap: MasterStyleMap,
  currentLanguage?: string
) {
  const tag = el.tagName.toLowerCase()

  // <title> is handled via the text-node path; skip here.
  if (tag === 'title') {
    return
  }

  // Generic attribute handling
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

  // <meta name|property=... content="...">
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
      if (rep) {
        el.setAttribute('content', rep.newText)

        // 🔑 Minimal fix: mark the element with the key and which attribute to fill on reinjection
        if (injectDataKey) {
          el.setAttribute(FRENGLISH_DATA_KEY, rep.hash)          // e.g., data-frenglish-key="abc123..."
          el.setAttribute('data-frenglish-attr', 'content')      // tells reinjector which attr to replace
        }
      }
    }
    return
  }

  // Tag the element with current language for debugging/queries (existing behavior)
  if (currentLanguage) {
    el.setAttribute('translated-lang', currentLanguage)
  }

  // (Unreachable before due to early return, left here for parity – kept as-is)
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
  injectDataKey = true,
  currentLanguage: string
): Promise<ExtractionResult & { styleMap: MasterStyleMap }> {
  const maps: TextMaps = { forward: {}, reverse: {} }
  const masterStyleMap:  MasterStyleMap  = {}
  const doc = await createDocument(html)
  const NodeConsts = doc.defaultView?.Node ?? { ELEMENT_NODE: 1, TEXT_NODE: 3 }
  /**
   * Checks if an element or any of its ancestors are marked as untranslatable.
   * This is the master check to exclude components like the WP Admin Bar.
   * @param element The element to check.
   * @returns `true` if the element should be skipped, otherwise `false`.
   */
  const isUntranslatable = (element: Element): boolean => {
    let current: Element | null = element;
    while (current) {
      // Check for specific markers
      if (
        current.id === 'wpadminbar' ||                  // Specifically exclude the WordPress admin bar
        current.classList.contains('no-translation') || // Exclude based on the 'no-translation' class
        current.hasAttribute('data-no-translation') ||  // Exclude based on a data attribute
        current.getAttribute('translate') === 'no'      // Respect the standard HTML 'translate' attribute
      ) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  };
  const walk = async (node: Node): Promise<void> => {
    if (node.nodeType === NodeConsts.ELEMENT_NODE) {
      const el = node as Element
      if (isUntranslatable(el)) {
        return;
      }
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

      const isIconElement = (tag === 'a' || tag === 'i' || tag === 'span') && !el.textContent?.trim();
      const hasIconClass = Array.from(el.classList).some(cls => cls.includes('icon') || cls.includes('ionicon'));

      if (isIconElement && hasIconClass) {
        await processAttributes(el, maps, injectPlaceholders, config, compress, injectDataKey, masterStyleMap, currentLanguage);
        return;
      }

      if (el.hasAttribute(FRENGLISH_DATA_KEY)) {
        return;
      }

      if (el.classList.contains('ionicon')) {
        await processAttributes(el, maps, injectPlaceholders, config, compress, injectDataKey, masterStyleMap, currentLanguage)
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
          await processAttributes(el, maps, injectPlaceholders, config, compress, injectDataKey, masterStyleMap, currentLanguage)
        }
        return
      }

      await processAttributes(el, maps, injectPlaceholders, config, compress, injectDataKey, masterStyleMap, currentLanguage)

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

// ----------------------------------------------------------------------------
// Language-based visibility pruning
// ----------------------------------------------------------------------------

/**
 * Normalizes a path:
 * - keeps only pathname
 * - ensures a single leading slash
 * - removes trailing slash (except root '/')
 * - lowercases for matching
 */
function normalizePath(p: string): string {
  try {
    if (/^https?:\/\//i.test(p)) {
      const u = new URL(p)
      p = u.pathname || '/'
    }
  } catch {
    /* ignore */
  }
  p = String(p || '').split('?')[0].split('#')[0].trim()
  if (!p.startsWith('/')) p = '/' + p
  p = p.replace(/\/{2,}/g, '/')
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p.toLowerCase()
}

/**
 * If path starts with a locale segment present in config (originLanguage or languages),
 * strip it for a looser match. E.g., /fr/products/a -> /products/a
 */
function stripLocalePrefix(p: string, config: Configuration): string {
  const segs = p.split('/').filter(Boolean)
  if (!segs.length) return p
  const first = segs[0].toLowerCase()
  const localeSet = new Set(([...(config.languages || []), config.originLanguage].filter(Boolean) as string[]).map(l => l.toLowerCase()))
  if (localeSet.has(first)) {
    const rest = '/' + segs.slice(1).join('/')
    return normalizePath(rest || '/')
  }
  return p
}

/**
 * Find the best ancestor to remove (menu item, list item, nav container, etc.)
 * Falls back to the anchor element itself if nothing matches within 6 levels.
 */
function findRemovalContainer(a: Element, extraSelectors: string[] = []): Element {
  const DEFAULT_SELECTORS = [
    'li.menu-item',
    '.menu-item',
    '.awb-menu__li',
    '.awb-menu__sub-li',
    '.nav-item',
    '[role="menuitem"]',
    'li',
  ]
  const selectors = [...DEFAULT_SELECTORS, ...extraSelectors]
  let cur: Element | null = a
  let depth = 0
  while (cur && depth < 6) {
    if (selectors.some(sel => cur!.matches?.(sel))) return cur!
    cur = cur.parentElement
    depth++
  }
  return a
}

/**
 * Build a quick index of normalized paths -> enabledLocales
 * (also keeps a version with locale prefix stripped for looser matches)
 */
function buildPathIndex(config: Configuration) {
  const exact = new Map<string, string[]>()
  const noloc = new Map<string, string[]>()
  const entries = config.languageAvailability?.entries || []

  for (const e of entries) {
    if (!e?.path) continue
    const p = normalizePath(e.path)
    const enabled = e.enabledLocales || []
    exact.set(p, enabled)
    noloc.set(stripLocalePrefix(p, config), enabled)
  }
  return { exact, noloc }
}

/**
 * Find the enabledLocales for a given href, trying:
 * 1) exact normalized path
 * 2) same path with locale prefix stripped
 * 3) substring fallback (entry.path contained in href path)
 */
function lookupEnabledLocalesForHref(
  hrefPath: string,
  config: Configuration,
  exact: Map<string, string[]>,
  noloc: Map<string, string[]>
): string[] | null {
  if (exact.has(hrefPath)) return exact.get(hrefPath)!
  const stripped = stripLocalePrefix(hrefPath, config)
  if (noloc.has(stripped)) return noloc.get(stripped)!

  // substring fallback
  let best: string[] | null = null
  let bestLen = 0
  for (const [p, locs] of exact.entries()) {
    if (hrefPath.includes(p) && p.length > bestLen) { best = locs; bestLen = p.length }
  }
  if (best) return best

  best = null
  bestLen = 0
  for (const [p, locs] of noloc.entries()) {
    if (hrefPath.includes(p) && p.length > bestLen) { best = locs; bestLen = p.length }
  }
  return best
}

function detectLanguageFromHtml(doc: Document, fallback?: string): string {
  let lang = (doc.documentElement.getAttribute('lang') || '').trim()
  if (!lang) lang = (doc.documentElement.getAttribute('xml:lang') || '').trim()
  if (!lang && doc.body) lang = (doc.body.getAttribute('lang') || '').trim()
  if (!lang) {
    const metaHttp = doc.querySelector('meta[http-equiv="content-language"]') as HTMLMetaElement | null
    const metaName = doc.querySelector('meta[name="language"]') as HTMLMetaElement | null
    lang = (metaHttp?.content || metaName?.content || '').trim()
  }
  if (!lang && fallback) lang = fallback
  return (lang || '').toLowerCase()
}

// --- locale helpers (add above or near the function) ---
const normalizeLocale = (s: string) =>
  (s || "").toLowerCase().replace("_", "-").trim();

const normalizeLocaleList = (ls: readonly string[] | undefined) =>
  Array.from(new Set((ls || []).map(normalizeLocale)));

const shouldAllowBaseLangPrefixWithReason = (
  currentLang: string,
  allLocales: readonly string[] | undefined,
  enabledLocalesForPath: readonly string[]
) => {
  const lang = normalizeLocale(currentLang);
  const base = lang.split("-")[0];

  const all = normalizeLocaleList(allLocales);
  const enabled = normalizeLocaleList(enabledLocalesForPath);

  const allHasBase = all.includes(base);
  const allHasVariant = all.some((l) => l.startsWith(base + "-"));
  const enabledHasBase = enabled.includes(base);
  const enabledHasVariant = enabled.some((l) => l.startsWith(base + "-"));

  // Global strictness: if site knows both base and a variant for this language, be strict.
  if ((allHasBase && allHasVariant) || (enabledHasBase && enabledHasVariant)) {
    return { allowBase: false, reason: "strict:base+variant-present" };
  }

  // NEW: Variant is known globally, but not enabled for this path -> be strict.
  // Example: lang=en-us, allLocales contains en-us, enabled=['sv','en'] -> no fallback
  if (lang.includes("-") && all.includes(lang) && !enabled.includes(lang)) {
    return { allowBase: false, reason: "strict:variant-known-but-not-enabled" };
  }

  return { allowBase: true, reason: "fallback-ok" };
};

const localeMatchesConditional = (
  currentLang: string,
  enabledLocales: readonly string[],
  allowBaseFallback: boolean
) => {
  const lang = normalizeLocale(currentLang);
  const enabled = normalizeLocaleList(enabledLocales);

  if (enabled.includes(lang)) return true;
  if (!allowBaseFallback) return false;

  // base fallback: en-us -> en (only if permitted)
  const base = lang.split("-")[0];
  return enabled.includes(base);
};

// ---------------------------------------------------------------------------
// Prune availableUI 
// ---------------------------------------------------------------------------
export async function pruneUnavailableUI(
  html: string,
  configuration: Configuration,
  opts: { strategy?: "remove" | "hide"; ancestorSelectors?: string[]; baseUrl?: string } = {}
): Promise<string> {
  const entries = configuration?.languageAvailability?.entries || [];
  if (!html || !entries.length) return html;

  const PRUNED_ATTR = "data-frenglish-pruned";
  const PRUNED_PATH_ATTR = "data-frenglish-pruned-path";

  const doc = await createDocument(html);
  const baseUrl = opts.baseUrl || doc.baseURI || "https://example.local";
  const { exact, noloc } = buildPathIndex(configuration);

  // derive language from the HTML, fall back to config
  const lang = detectLanguageFromHtml(
    doc,
    configuration.originLanguage || (configuration.languages?.[0] ?? "")
  );
  const allLocales = (configuration as any)?.locales ?? configuration?.languages ?? [];

  const removeOurDisplayNone = (el: Element) => {
    const style = el.getAttribute("style") || "";
    const newStyle = style
      .replace(/(?:^|;)\s*display\s*:\s*none\s*!important\s*;?/i, ";")
      .replace(/;;+/g, ";")
      .replace(/^\s*;\s*|\s*;\s*$/g, "");
    if (newStyle) el.setAttribute("style", newStyle);
    else el.removeAttribute("style");
  };

  const addOurDisplayNone = (el: Element) => {
    const style = el.getAttribute("style") || "";
    if (/display\s*:\s*none\s*!important/i.test(style)) return;
    el.setAttribute(
      "style",
      (style ? style.replace(/\s*;?\s*$/, "; ") : "") + "display:none !important;"
    );
  };

  const isHiddenByUs = (el: Element) => {
    if (el.getAttribute(PRUNED_ATTR) === "language-mismatch") return true;
    const style = el.getAttribute("style") || "";
    return /display\s*:\s*none\s*!important/i.test(style);
  };

  const countVisibleSubmenuItems = (menuItemLi: Element): number => {
    // count descendent <li> items that are not hidden/pruned
    const lis = Array.from(menuItemLi.querySelectorAll("li"));
    let count = 0;
    for (const li of lis) {
      if (!li.querySelector("a[href]")) continue; // only rows with a link
      if (!isHiddenByUs(li)) count++;
    }
    return count;
  };

  const collapseIfDropdownEmpty = (menuItemLi: Element) => {
    if (!menuItemLi.classList.contains("menu-item-has-children")) return;
    const remaining = countVisibleSubmenuItems(menuItemLi);
    if (remaining > 0) return;
    if (opts.strategy === "remove") {
      menuItemLi.remove();
    } else {
      addOurDisplayNone(menuItemLi);
      menuItemLi.setAttribute(PRUNED_ATTR, "language-mismatch");
      if (!menuItemLi.getAttribute(PRUNED_PATH_ATTR)) {
        menuItemLi.setAttribute(PRUNED_PATH_ATTR, "(empty-dropdown)");
      }
      const topA = menuItemLi.querySelector(":scope > a");
      if (topA && !topA.hasAttribute("tabindex"))
        (topA as HTMLElement).setAttribute("tabindex", "-1");
    }
  };

  // Phase 1: reveal previously hidden (if rules changed)
  {
    const previouslyHidden = Array.from(
      doc.querySelectorAll(`[${PRUNED_ATTR}="language-mismatch"]`)
    ) as Element[];
    for (const el of previouslyHidden) {
      const raw = el.getAttribute(PRUNED_PATH_ATTR) || "";
      const path = normalizePath(raw);
      const enabled = lookupEnabledLocalesForHref(path, configuration, exact, noloc);
      if (!enabled) {
        removeOurDisplayNone(el);
        el.removeAttribute(PRUNED_ATTR);
        el.removeAttribute(PRUNED_PATH_ATTR);
        el.querySelectorAll('a[tabindex="-1"]').forEach((a) =>
          (a as HTMLElement).removeAttribute("tabindex")
        );
        continue;
      }
      const { allowBase } = shouldAllowBaseLangPrefixWithReason(lang, allLocales, enabled);
      const allowed = localeMatchesConditional(lang, enabled, allowBase);
      if (allowed) {
        removeOurDisplayNone(el);
        el.removeAttribute(PRUNED_ATTR);
        el.removeAttribute(PRUNED_PATH_ATTR);
        el.querySelectorAll('a[tabindex="-1"]').forEach((a) =>
          (a as HTMLElement).removeAttribute("tabindex")
        );
        el.querySelectorAll(`[${PRUNED_ATTR}="language-mismatch"]`).forEach((child) => {
          removeOurDisplayNone(child as Element);
          child.removeAttribute(PRUNED_ATTR);
          child.removeAttribute(PRUNED_PATH_ATTR);
        });
      }
    }
  }

  // Phase 2: scan anchors and prune disallowed ones
  const anchors = Array.from(doc.querySelectorAll("a[href]")) as HTMLAnchorElement[];

  for (const a of anchors) {
    const rawHref = a.getAttribute("href") || "";
    if (!rawHref || /^(mailto:|tel:|javascript:)/i.test(rawHref)) continue;

    let pathname = "";
    try {
      const u = new URL(rawHref, baseUrl);
      pathname = normalizePath(u.pathname);
    } catch {
      pathname = normalizePath(rawHref);
    }

    const enabled = lookupEnabledLocalesForHref(pathname, configuration, exact, noloc);
    if (!enabled) continue;

    const { allowBase } = shouldAllowBaseLangPrefixWithReason(lang, allLocales, enabled);
    const allowed = localeMatchesConditional(lang, enabled, allowBase);
    if (allowed) continue;

    const container = findRemovalContainer(a, opts.ancestorSelectors || []);
    const linksInside = container.querySelectorAll("a[href]");

    // If this <a> is the top trigger of a dropdown, KEEP the dropdown visible.
    // Neutralize the top link, then hide/remove only submenu items that point to the disallowed path.
    const isTopTrigger =
      container.classList.contains("menu-item-has-children") &&
      a.parentElement === container &&
      linksInside.length > 1;

    if (isTopTrigger) {
      // Neutralize top anchor (keep visible so mega-menu mechanics remain)
      const topA = a; // same reference as passed
      topA.setAttribute(PRUNED_ATTR, "language-mismatch");
      topA.setAttribute(PRUNED_PATH_ATTR, pathname);
      topA.setAttribute("aria-disabled", "true");
      topA.setAttribute("tabindex", "0");
      topA.removeAttribute("href");
      (topA as HTMLElement).style.cursor = "default";
      topA.setAttribute("role", "button");

      // Hide/remove only submenu items that match the disallowed path
      const submenuLinks = Array.from(container.querySelectorAll("a[href]")) as HTMLAnchorElement[];
      for (const subA of submenuLinks) {
        if (subA === topA) continue; // skip the neutralized top link
        let subPath = "";
        try {
          const u2 = new URL(subA.getAttribute("href") || "", baseUrl);
          subPath = normalizePath(u2.pathname);
        } catch {
          subPath = normalizePath(subA.getAttribute("href") || "");
        }
        if (subPath === pathname) {
          const subLi = findRemovalContainer(subA, opts.ancestorSelectors || []);
          if (opts.strategy === "remove") {
            subLi.remove();
          } else {
            addOurDisplayNone(subLi);
            subLi.setAttribute(PRUNED_ATTR, "language-mismatch");
            subLi.setAttribute(PRUNED_PATH_ATTR, subPath);
            if (!subA.hasAttribute("tabindex")) subA.setAttribute("tabindex", "-1");
          }
        }
      }

      // After pruning matching submenu items, collapse ONLY if dropdown is now empty
      collapseIfDropdownEmpty(container);
      continue;
    }

    // Non-top items: hide/remove the specific item (not the whole dropdown)
    const target = linksInside.length > 1 ? a : container;
    if (opts.strategy === "remove") {
      const parentDropdown = container.closest(".menu-item-has-children");
      target.remove();
      if (parentDropdown) collapseIfDropdownEmpty(parentDropdown);
    } else {
      addOurDisplayNone(target);
      target.setAttribute(PRUNED_ATTR, "language-mismatch");
      target.setAttribute(PRUNED_PATH_ATTR, pathname);
      const link =
        target.tagName.toLowerCase() === "a"
          ? (target as HTMLElement)
          : ((target.querySelector("a") as HTMLElement | null) ?? null);
      if (link && !link.hasAttribute("tabindex")) link.setAttribute("tabindex", "-1");

      const parentDropdown = container.closest(".menu-item-has-children");
      if (parentDropdown) collapseIfDropdownEmpty(parentDropdown);
    }
  }

  return doc.documentElement.outerHTML;
}