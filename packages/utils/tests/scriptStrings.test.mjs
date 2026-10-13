import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'

import {
  escapeForJsString,
  extractScriptStrings,
  extractStrings,
  looksLikeReadableText,
  rewriteScriptStrings,
  scriptStringKey,
  translateInlineScripts,
} from '../dist/index.js'

// Shaped like the sentiersprives.com map: display text next to code keys, a
// lookup by place name, and position overrides keyed on the same names.
const MAP_SCRIPT = `(function(){ function initDemoMap(){
  const regions=[{key:'quebec',label:'Québec Province'},{key:'britishcolumbia',label:'British Columbia'}];
  const markers=[
    {region:'ontario',place:'Niagara Falls',title:'Fly privately over Niagara Falls',img:'https://example.com/a.jpg'},
    {region:'quebec',place:'Québec City',title:'Discover the old town walls',img:'/b.jpg'}
  ];
  const hubs=[{region:'quebec',places:['Québec City']}];
  const labelOverrides={'Lake Louise':'LL'};
  const out=[];
  for(const m of markers){
    if(m.place==='Niagara Falls'){ m.mapX=609; }
    const found=hubs.flatMap(h=>markers.filter(x=>x.region===h.region&&x.place.indexOf(h.places[0])!==-1));
    out.push({place:m.place,title:m.title,x:m.mapX||0,hub:found.length,cls:'sp-city-label sp-bc-city-style'});
  }
  document.querySelector('.sp-region-tabs');
  if(window.lastKey==='Escape'){ out.length=0 }
  globalThis.result=out; globalThis.regionLabels=regions.map(r=>r.label); globalThis.override=labelOverrides['Lake Louise'];
} initDemoMap(); })();`

const config = { originLanguage: 'en', languages: ['fr'], translatableScripts: [{ contains: 'initDemoMap' }] }

const FR = {
  'Niagara Falls': 'Chutes du Niagara',
  'Fly privately over Niagara Falls': "Survolez l'île et les chutes du Niagara en privé",
  'Québec City': 'Ville de Québec',
  'Discover the old town walls': 'Découvrez les remparts du "Vieux-Québec"',
  'Québec Province': 'Province de Québec',
  'British Columbia': 'Colombie-Britannique',
  'Lake Louise': 'Lac Louise',
}
const byHash = Object.fromEntries(Object.entries(FR).map(([en, fr]) => [scriptStringKey(en).hash, fr]))
const translate = hash => byHash[hash]

const run = source => {
  const context = { document: { querySelector: () => null }, window: {}, globalThis: {} }
  context.globalThis = context
  vm.runInNewContext(source, context)
  return context
}

test('readable text: several real words, never code, CSS, URLs or single tokens', () => {
  for (const text of ['Fly privately over Niagara Falls', 'Banff & Canmore', 'Québec City', "Survolez l'île"]) {
    assert.equal(looksLikeReadableText(text), true, text)
  }
  for (const code of ['Escape', 'click', 'ontario', 'sp-city-label sp-bc-city-style', 'translate(-50%, -50%)',
    'https://example.com/a b', '/wp-content/x y', 'DM Sans, sans-serif', 'a', '12 34', 'rgba(0, 0, 0, 0.1)', '<li><strong>x y</strong>']) {
    assert.equal(looksLikeReadableText(code), false, code)
  }
})

test('extraction keeps display text and leaves out keys, lookups and code values', async () => {
  const texts = (await extractScriptStrings(MAP_SCRIPT)).map(s => s.text).sort()
  assert.deepEqual(texts, ['British Columbia', 'Discover the old town walls', 'Fly privately over Niagara Falls', 'Niagara Falls', 'Québec City', 'Québec Province'])
  // 'Lake Louise' is an object key somewhere, so no copy of it is ever translated
  assert.ok(!texts.includes('Lake Louise'))
})

test('extraction is deterministic: the same script always yields the same keys', async () => {
  assert.deepEqual(await extractScriptStrings(MAP_SCRIPT), await extractScriptStrings(MAP_SCRIPT))
})

test('the rewritten script parses, shows the translations and still behaves the same', async () => {
  const before = run(MAP_SCRIPT)
  const rewritten = await rewriteScriptStrings(MAP_SCRIPT, translate)
  assert.notEqual(rewritten, MAP_SCRIPT)
  const after = run(rewritten)

  assert.equal(after.result[0].title, FR['Fly privately over Niagara Falls'])
  assert.equal(after.result[1].title, FR['Discover the old town walls'])
  assert.deepEqual([...after.regionLabels], ['Province de Québec', 'Colombie-Britannique'])
  // Behavior: the position override and the hub lookup still match their places
  assert.equal(after.result[0].x, before.result[0].x)
  assert.deepEqual([...after.result.map(r => r.hub)], [...before.result.map(r => r.hub)])
  // Code untouched
  assert.equal(after.result[0].cls, 'sp-city-label sp-bc-city-style')
  assert.equal(after.override, 'LL')
  assert.match(rewritten, /region:'ontario'/)
})

test('escaping: quotes, backslashes, newlines and </script never break the literal', () => {
  for (const quote of ["'", '"', '`']) {
    for (const text of ["l'île", 'say "hi"', 'back\\slash', 'line\nbreak', 'a </script> b', 'tick ` and ${x}', 'sep x']) {
      const literal = quote + escapeForJsString(text, quote) + quote
      assert.equal(vm.runInNewContext(literal), text, `${quote} ${JSON.stringify(text)}`)
      assert.ok(!/<\/script/i.test(literal))
    }
  }
})

test('a translation that would add markup is ignored, and an unparseable script is returned as is', async () => {
  const src = `function initDemoMap(){ const t='Fly privately over Niagara Falls' }`
  const withTags = await rewriteScriptStrings(src, () => '<b>Survolez</b> les chutes')
  assert.equal(withTags, src)
  const broken = `function initDemoMap( { 'Fly privately over Niagara Falls'`
  assert.equal(await rewriteScriptStrings(broken, translate), broken)
})

test('HTML entities in a translation are decoded for JavaScript', async () => {
  const src = `function initDemoMap(){ return 'Banff and Canmore views' }`
  const key = scriptStringKey('Banff and Canmore views').hash
  const out = await rewriteScriptStrings(src, h => (h === key ? 'Banff &amp; Canmore' : undefined))
  assert.equal(vm.runInNewContext(out + '; initDemoMap()'), 'Banff & Canmore')
})

const page = script => `<!doctype html><html><head></head><body><p>Hello visible world</p>${script}</body></html>`

test('extractStrings reads opted-in scripts without ever mutating them, including on the visitor path', async () => {
  const html = page(`<script>${MAP_SCRIPT}</script>`)
  for (const lang of ['en', 'fr', undefined]) {
    // The visitor path sends the English page with currentLanguage = target
    const result = await extractStrings(html, true, config, false, true, lang)
    assert.ok(Object.values(result.textMap).includes('Fly privately over Niagara Falls'), String(lang))
    assert.ok(result.modifiedHtml.includes(MAP_SCRIPT.slice(0, 200)), 'script left byte-identical')
  }
})

test('a script stamped as translated is never read as source text (no translation loop)', async () => {
  const translated = await translateInlineScripts(page(`<script>${MAP_SCRIPT}</script>`), config, 'fr', translate)
  assert.match(translated, /<script data-frenglish-script-lang="fr">/)
  const again = await extractStrings(translated, true, config, false, true, 'fr')
  const values = Object.values(again.textMap)
  assert.ok(!values.some(v => v.includes('Survolez') || v.includes('Chutes')), 'French script text never becomes a key')
  // A source-language stamp (served HTML pasted back into a CMS) is not a reason to skip
  const pasted = page(`<script data-frenglish-script-lang="en">${MAP_SCRIPT}</script>`)
  assert.ok(Object.values((await extractStrings(pasted, false, config, false, true, 'en')).textMap).includes('Fly privately over Niagara Falls'))
})

test('scripts that are not opted in, external or not JavaScript are ignored', async () => {
  const noOptIn = { ...config, translatableScripts: null }
  const a = await extractStrings(page(`<script>${MAP_SCRIPT}</script>`), false, noOptIn, false, true, 'en')
  assert.ok(!Object.values(a.textMap).includes('Fly privately over Niagara Falls'))
  const b = await extractStrings(page(`<script type="application/json">{"t":"initDemoMap Fly privately over"}</script>`), false, config, false, true, 'en')
  assert.equal(Object.values(b.textMap).filter(v => v.includes('Fly')).length, 0)

  const html = page(`<script src="/x.js"></script><script type="application/json">${MAP_SCRIPT}</script>`)
  assert.equal(await translateInlineScripts(html, config, 'fr', translate), html)
  assert.equal(await translateInlineScripts(page(`<script>${MAP_SCRIPT}</script>`), noOptIn, 'fr', translate), page(`<script>${MAP_SCRIPT}</script>`))
  // Source-language pages are never rewritten
  assert.equal(await translateInlineScripts(page(`<script>${MAP_SCRIPT}</script>`), config, 'en', translate), page(`<script>${MAP_SCRIPT}</script>`))
})

test('reassembly translates the opted-in script, and a second pass changes nothing', async () => {
  const html = page(`<script>${MAP_SCRIPT}</script><script>var other='Fly privately over Niagara Falls'</script>`)
  const once = await translateInlineScripts(html, config, 'fr', translate)
  assert.ok(once.includes("Survolez l\\'île et les chutes du Niagara en privé"))
  // Only the opted-in script changes
  assert.ok(once.includes("<script>var other='Fly privately over Niagara Falls'</script>"))
  // French strings are not keys in the map, so re-running is a no-op (no loop)
  assert.equal(await translateInlineScripts(once, config, 'fr', translate), once)
})

test('pathological scripts fail closed: nothing extracted, nothing rewritten, no throw', async () => {
  const deep = 'function initDemoMap(){ return ' + '['.repeat(20000) + "'Fly privately over Niagara Falls'" + ']'.repeat(20000) + ' }'
  assert.deepEqual(await extractScriptStrings(deep), [])
  assert.equal(await rewriteScriptStrings(deep, translate), deep)
})
