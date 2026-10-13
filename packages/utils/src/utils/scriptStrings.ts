// Readable text inside opted-in inline <script> blocks (e.g. a map widget whose
// labels live in a JavaScript data array).
//
// The JavaScript never carries placeholders. Extraction only *reads* a script's
// string literals into the text map; reassembly rewrites each literal in place
// with an escaped translation, re-parses the result, and keeps the original
// script when it no longer parses. The worst a bad translation can do is leave
// the script in the source language.

import pkg from 'crypto-js'
import { Configuration, TranslatableScript } from '../types/configuration.js'
import { canonicalizeForHash } from './html.js'
import { extractTextComponents } from './utils.js'

const { SHA256 } = pkg


/** Skip scripts above this size: parsing cost grows with the source. */
const MAX_SCRIPT_LENGTH = 1_000_000
/** No single readable string is longer than this; longer literals are data blobs. */
const MAX_STRING_LENGTH = 2_000

export function isTranslatableScript(source: string | null | undefined, config: Configuration | null | undefined): boolean {
  const entries = (config as any)?.translatableScripts as TranslatableScript[] | null | undefined
  if (!source || !Array.isArray(entries) || entries.length === 0) return false
  if (source.length > MAX_SCRIPT_LENGTH) return false
  return entries.some(e => typeof e?.contains === 'string' && e.contains.trim().length >= 8 && source.includes(e.contains))
}

/** Stamped on a script once its strings are translated: `<script data-frenglish-script-lang="fr">`. */
export const SCRIPT_LANG_ATTRIBUTE = 'data-frenglish-script-lang'

/**
 * A script stamped with a target language is translated output and must never be
 * read as source text. A stamp matching the source language is ignored: customers
 * sometimes paste served HTML back into their CMS.
 */
export function isScriptAlreadyTranslated(stamp: string | null | undefined, config: Configuration | null | undefined): boolean {
  const lang = (stamp || '').trim().toLowerCase()
  if (!lang) return false
  return lang !== ((config as any)?.originLanguage || '').toLowerCase()
}

/** True for <script> types that hold JavaScript (not JSON, templates, etc.). */
export function isJavaScriptType(type: string | null | undefined): boolean {
  const t = (type || '').trim().toLowerCase()
  return t === '' || t === 'text/javascript' || t === 'application/javascript' || t === 'module'
}

// ---------------------------------------------------------------------------
// Which literals are readable text
// ---------------------------------------------------------------------------

// Property names whose values are code, not text: identifiers, URLs, styling.
const CODE_PROPERTY_NAMES = new Set([
  'id', 'key', 'keys', 'class', 'classname', 'classlist', 'type', 'href', 'src', 'srcset', 'url', 'uri', 'img', 'image',
  'images', 'icon', 'slug', 'path', 'paths', 'region', 'province', 'country', 'code', 'lang', 'language', 'locale', 'color',
  'colour', 'background', 'font', 'fontfamily', 'style', 'styles', 'selector', 'name_id', 'value', 'rel', 'target', 'method',
  'action', 'mode', 'format', 'event', 'events', 'role', 'tag', 'tagname', 'mime', 'mimetype', 'hash', 'anchor', 'labelclass',
])

// Assignment targets whose value is code (el.className = ..., el.style.x = ...).
const CODE_ASSIGNMENT_PROPERTIES = new Set([
  'classname', 'id', 'href', 'src', 'srcset', 'type', 'rel', 'target', 'name', 'value', 'csstext', 'innerhtml', 'outerhtml',
  'method', 'action', 'lang', 'dir', 'role',
])

// Calls whose string arguments are selectors, names, URLs or events.
const CODE_CALLEES = new Set([
  'queryselector', 'queryselectorall', 'getelementbyid', 'getelementsbyclassname', 'getelementsbytagname', 'getelementsbyname',
  'closest', 'matches', 'createelement', 'createelementns', 'getattribute', 'removeattribute', 'hasattribute', 'toggleattribute',
  'addeventlistener', 'removeeventlistener', 'add', 'remove', 'toggle', 'contains', 'replace', 'setproperty', 'getpropertyvalue',
  'fetch', 'open', 'require', 'import', 'postmessage', 'dispatchevent', 'createevent', 'customevent', 'event', 'pushstate',
  'replacestate', 'assign', 'reload', 'insertadjacenthtml', 'insertadjacentelement', 'setitem', 'getitem', 'removeitem',
])

/** Content check: several real words, nothing that looks like code, markup, CSS or a URL. */
export function looksLikeReadableText(value: string): boolean {
  const v = value.trim()
  if (v.length < 3 || v.length > MAX_STRING_LENGTH) return false
  if (!/\p{L}/u.test(v)) return false
  // Two or more words of letters: single tokens are too often identifiers
  // ('Escape', 'click', 'ontario'), and translating one would change behavior.
  const words = v.split(/\s+/).filter(w => /\p{L}{2,}/u.test(w))
  if (words.length < 2) return false
  // Markup, code and CSS characters
  if (/[<>{}[\]();=|\\^`$%*#@~]/.test(v)) return false
  // URLs, paths, emails, protocols
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\.{0,2}\/|www\.)/i.test(v) || /\S+@\S+\.\S+/.test(v)) return false
  // Class lists and kebab/snake tokens ('sp-city-label sp-bc-city-style')
  const tokens = v.split(/\s+/)
  if (tokens.every(t => /^[a-z0-9_-]+$/.test(t)) && tokens.some(t => /[-_0-9]/.test(t))) return false
  // Font stacks and CSS keywords
  if (/\b(?:sans-serif|serif|monospace|cursive|fantasy|system-ui|ease-in-out|ease-in|ease-out|!important)\b/i.test(v)) return false
  return true
}

type Literal = { start: number; end: number; quote: '"' | "'" | '`'; value: string }

const propName = (node: any): string | null => {
  if (!node) return null
  if (node.type === 'Identifier') return node.name
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  return null
}

const calleeName = (callee: any): string | null => {
  if (!callee) return null
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed) return propName(callee.property)
  return null
}

/**
 * Every string literal (and expression-free template literal) in `source`, split
 * into those that may be translated and the values that must never change.
 * Returns null when the source does not parse.
 */
async function collectLiterals(source: string): Promise<{ readable: Literal[]; blocked: Set<string> } | null> {
  const ast = await parseScript(source)
  if (!ast) return null

  const readable: Literal[] = []
  const blocked = new Set<string>()

  const visit = (node: any, parent: any, grand: any): void => {
    if (!node || typeof node.type !== 'string') return

    const isString = node.type === 'Literal' && typeof node.value === 'string'
    const isPlainTemplate = node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1
    if (isString || isPlainTemplate) {
      const value: string = isString ? node.value : (node.quasis[0].value.cooked ?? '')
      const quote = (isString ? source[node.start] : '`') as Literal['quote']
      if (isCodePosition(node, parent, grand)) {
        blocked.add(value)
      } else if (looksLikeReadableText(value)) {
        readable.push({ start: node.start, end: node.end, quote, value })
      }
      return
    }

    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue
      const child = node[key]
      if (Array.isArray(child)) {
        for (const c of child) if (c && typeof c.type === 'string') visit(c, node, parent)
      } else if (child && typeof child.type === 'string') {
        visit(child, node, parent)
      }
    }
  }
  try {
    visit(ast, null, null)
  } catch {
    // Pathological input (e.g. nesting deep enough to exhaust the stack): treat the
    // script as having nothing to translate rather than fail the whole page
    return null
  }

  return { readable, blocked }
}

/** A literal whose value the code relies on: keys, lookups, selectors, names, URLs, styles. */
function isCodePosition(node: any, parent: any, grand: any): boolean {
  if (!parent) return false
  switch (parent.type) {
    case 'Property':
      if (parent.key === node) return true
      return CODE_PROPERTY_NAMES.has((propName(parent.key) || '').toLowerCase())
    case 'MethodDefinition':
    case 'PropertyDefinition':
      return parent.key === node
    case 'MemberExpression':
      return parent.property === node
    case 'TaggedTemplateExpression':
      return true // css`...`, html`...`: always code
    case 'ImportDeclaration':
    case 'ExportNamedDeclaration':
    case 'ExportAllDeclaration':
    case 'ImportExpression':
      return true
    case 'ExpressionStatement':
      return !!parent.directive // 'use strict'
    case 'BinaryExpression':
      return parent.operator === 'in' && parent.left === node
    case 'AssignmentExpression': {
      if (parent.right !== node || parent.left?.type !== 'MemberExpression') return false
      const prop = (propName(parent.left.property) || '').toLowerCase()
      const onStyle = parent.left.object?.type === 'MemberExpression' && propName(parent.left.object.property) === 'style'
      const onDataset = parent.left.object?.type === 'MemberExpression' && propName(parent.left.object.property) === 'dataset'
      return onStyle || onDataset || CODE_ASSIGNMENT_PROPERTIES.has(prop)
    }
    case 'CallExpression':
    case 'NewExpression': {
      if (parent.callee === node) return true
      const name = (calleeName(parent.callee) || '').toLowerCase()
      if (CODE_CALLEES.has(name)) return true
      // setAttribute(name, value): the name is code, the value may be text
      if (name === 'setattribute' || name === 'setattributens') return parent.arguments[0] === node
      return false
    }
    case 'ArrayExpression':
      // ['a', 'b'] as a code-valued property (e.g. images: [...]) inherits its key's role
      return grand?.type === 'Property' && grand.value === parent && CODE_PROPERTY_NAMES.has((propName(grand.key) || '').toLowerCase())
    default:
      return false
  }
}

async function parseScript(source: string): Promise<any | null> {
  let acorn: typeof import('acorn')
  try {
    acorn = await import('acorn')
  } catch {
    return null
  }
  const base = { ecmaVersion: 'latest' as const, allowHashBang: true, allowReturnOutsideFunction: true }
  try {
    return acorn.parse(source, { ...base, sourceType: 'script' })
  } catch {
    try {
      return acorn.parse(source, { ...base, sourceType: 'module' })
    } catch {
      return null
    }
  }
}

// ---------------------------------------------------------------------------
// Keys: one per distinct text, shared by extraction and reassembly
// ---------------------------------------------------------------------------

/** The text-map key and the trimmed text for a literal value (whitespace is kept around the translation). */
export function scriptStringKey(value: string): { hash: string; text: string; leading: string; trailing: string } | null {
  const { leadingSpace, middleText, trailingSpace } = extractTextComponents(value)
  if (!middleText) return null
  const canon = canonicalizeForHash(middleText)
  if (!canon) return null
  return { hash: SHA256(canon).toString(), text: middleText, leading: leadingSpace, trailing: trailingSpace }
}

/**
 * The readable texts in an opted-in script, keyed like every other text-map entry.
 * Values the code also uses as keys, selectors or names are left out entirely, so
 * every copy of a string is translated or none is.
 */
export async function extractScriptStrings(source: string): Promise<Array<{ hash: string; text: string }>> {
  const found = await collectLiterals(source).catch(() => null)
  if (!found) return []
  const out = new Map<string, string>()
  for (const lit of found.readable) {
    if (found.blocked.has(lit.value)) continue
    const key = scriptStringKey(lit.value)
    if (key && !out.has(key.hash)) out.set(key.hash, key.text)
  }
  return Array.from(out, ([hash, text]) => ({ hash, text }))
}

// ---------------------------------------------------------------------------
// Rewriting
// ---------------------------------------------------------------------------

const ENTITY_RE = /&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/i
const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** Translations come back HTML-escaped; JavaScript needs the plain text. */
function decodeEntities(s: string): string {
  return s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
    }
    return NAMED_ENTITIES[e.toLowerCase()] ?? m
  })
}

/** The body of a JavaScript string literal delimited by `quote`. */
export function escapeForJsString(text: string, quote: '"' | "'" | '`'): string {
  let out = text.replace(/\\/g, '\\\\')
  out = quote === '`'
    ? out.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
    : out.replace(quote === '"' ? /"/g : /'/g, `\\${quote}`)
  return out
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    // Line/paragraph separators end a string literal in older engines
    .replace(/[\u2028\u2029]/g, c => (c === '\u2028' ? '\\u2028' : '\\u2029'))
    // An inline script ends at the first "</script", wherever it appears
    .replace(/<\/(script)/gi, '<\\/$1')
}

/**
 * `source` with its readable strings replaced by `translate(hash)`, or the
 * original source when nothing changes or the result would not parse.
 */
export async function rewriteScriptStrings(source: string, translate: (hash: string) => string | null | undefined): Promise<string> {
  const found = await collectLiterals(source).catch(() => null)
  if (!found || found.readable.length === 0) return source

  let rewritten = ''
  let cursor = 0
  let changed = false
  for (const lit of found.readable) {
    if (found.blocked.has(lit.value)) continue
    const key = scriptStringKey(lit.value)
    if (!key) continue
    const raw = translate(key.hash)
    if (typeof raw !== 'string') continue
    const translated = ENTITY_RE.test(lit.value) ? raw : decodeEntities(raw)
    // A translation that grew markup or lost its text is not safe to inline
    if (!translated.trim() || /[<>]/.test(translated)) continue
    if (translated === key.text) continue
    rewritten += source.slice(cursor, lit.start + 1) + escapeForJsString(key.leading + translated + key.trailing, lit.quote)
    cursor = lit.end - 1
    changed = true
  }
  if (!changed) return source
  rewritten += source.slice(cursor)

  // Never ship a script that does not parse: keep the source language instead
  return (await parseScript(rewritten)) ? rewritten : source
}

/**
 * Translate the opted-in inline scripts of a finished HTML document into
 * `language`, stamping each script it changes. Every other script, and every
 * script on a source-language page, is returned untouched.
 */
export async function translateInlineScripts(
  html: string,
  config: Configuration,
  language: string | null | undefined,
  translate: (hash: string) => string | null | undefined,
): Promise<string> {
  const lang = (language || '').trim().toLowerCase()
  if (!html || !lang || !(config as any)?.translatableScripts?.length) return html
  if (lang === ((config as any)?.originLanguage || '').toLowerCase()) return html
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(lang)) return html

  // An inline script's body cannot contain "</script", so this match is exact
  const SCRIPT_RE = /(<script\b([^>]*)>)([\s\S]*?)(<\/script\s*>)/gi
  const STAMP_RE = new RegExp(`\\s${SCRIPT_LANG_ATTRIBUTE}\\s*=\\s*["']?([^"'\\s>]+)`, 'i')
  const parts: Array<string | Promise<string>> = []
  let last = 0
  for (const m of html.matchAll(SCRIPT_RE)) {
    const [whole, open, attrs, body, close] = m
    const padded = ' ' + attrs
    if (/\ssrc\s*=/i.test(padded)) continue
    if (!isJavaScriptType(padded.match(/\stype\s*=\s*["']?([^"'\s>]+)/i)?.[1])) continue
    if (isScriptAlreadyTranslated(padded.match(STAMP_RE)?.[1], config)) continue
    if (!isTranslatableScript(body, config)) continue
    parts.push(html.slice(last, m.index!))
    parts.push(
      rewriteScriptStrings(body, translate)
        .catch(() => body)
        .then(out => (out === body ? open : open.replace(/^<script\b/i, `<script ${SCRIPT_LANG_ATTRIBUTE}="${lang}"`)) + out),
    )
    parts.push(close)
    last = m.index! + whole.length
  }
  if (parts.length === 0) return html
  parts.push(html.slice(last))
  return (await Promise.all(parts)).join('')
}
