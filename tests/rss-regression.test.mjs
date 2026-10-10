import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const loadExternal = createRequire(import.meta.url)

// Load the actual TS modules with mocked HTTP/storage, without adding a test runtime.
function createLoader(overrides = {}) {
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename)
    const compiledModule = { exports: {} }
    cache.set(filename, compiledModule.exports)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText
    vm.runInNewContext(code, {
      exports: compiledModule.exports, URL, AbortSignal, console, setTimeout, ...overrides,
      require(name) {
        if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`)
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`))
        return loadExternal(name)
      },
    })
    return compiledModule.exports
  }
  return load
}

async function parse(xml) {
  const load = createLoader({ fetch: async () => ({ ok: true, text: async () => xml }) })
  return load('src/lib/rss.ts').fetchAndParseFeed('https://example.com/feed')
}

for (const format of ['RSS', 'RDF']) {
  test(`${format}: CDATA metadata renders as text and retains HTML body`, async () => {
    const channel = `<channel><title><![CDATA[One Useful Thing]]></title>
      <link><![CDATA[https://example.com/]]></link>
      <description><![CDATA[AI & work]]></description>
      <image><url><![CDATA[/logo.png]]></url></image></channel>`
    const item = `<item><title><![CDATA[AI &amp; work]]></title>
      <link><![CDATA[https://example.com/post]]></link>
      <description><![CDATA[<p>Real article body</p>]]></description></item>`
    const xml = format === 'RSS'
      ? `<rss version="2.0">${channel.replace('</channel>', `${item}</channel>`)}</rss>`
      : `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">${channel}${item}</rdf:RDF>`
    const feed = await parse(xml)
    assert.equal(feed.title, 'One Useful Thing')
    assert.equal(feed.description, 'AI & work')
    assert.equal(feed.link, 'https://example.com/')
    assert.equal(feed.items[0].title, 'AI & work')
    assert.equal(feed.items[0].link, 'https://example.com/post')
    assert.equal(feed.items[0].content, '<p>Real article body</p>')
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement('div', null, feed.title)))
    if (format === 'RSS') assert.equal(feed.imageUrl, 'https://example.com/logo.png')
  })
}

test('Atom: CDATA author and dates remain strings', async () => {
  const feed = await parse(`<feed xmlns="http://www.w3.org/2005/Atom">
    <title><![CDATA[Blog]]></title><link href="https://example.com/"/>
    <entry><title>123</title><link href="https://example.com/post"/>
      <author><name><![CDATA[Author]]></name></author>
      <published><![CDATA[2026-10-10T00:00:00Z]]></published>
      <content type="html"><![CDATA[<p>Body</p>]]></content></entry></feed>`)
  assert.equal(feed.items[0].title, '123')
  assert.equal(feed.items[0].author, 'Author')
  assert.equal(feed.items[0].pubDate, '2026-10-10T00:00:00Z')
  assert.equal(feed.items[0].content, '<p>Body</p>')
})

for (const version of [0, 1]) {
  test(`storage v${version}: repairs cached CDATA without losing subscriptions or favorites`, async () => {
    const data = {
      feeds: [{ id: 'f', title: { __cdata: 'Ahead of AI' }, url: 'https://example.com/feed',
        link: { __cdata: 'https://example.com/' }, description: { __cdata: 'AI research' }, folderId: 'd' }],
      folders: [{ id: 'd', name: 'AI' }], readLinks: ['https://example.com/post'],
      starredItems: [{ id: 'a', feedId: 'f', title: { __cdata: 'Saved' },
        content: '<p>Saved body</p>', isStarred: true, summary: 'Legacy summary' }],
      summaries: { a: 'Legacy summary' },
    }
    let saved = JSON.stringify({ state: data, version })
    const previousWindow = global.window
    global.window = { localStorage: { getItem: () => saved, setItem: (_, value) => { saved = value } } }
    try {
      const store = createLoader()('src/lib/feed-store.ts').useFeedStore
      await store.persist.rehydrate()
      const state = store.getState()
      assert.equal(state.feeds[0].title, 'Ahead of AI')
      assert.equal(state.feeds[0].description, 'AI research')
      assert.equal(state.feeds[0].id, 'f')
      assert.equal(state.feeds[0].folderId, 'd')
      assert.deepEqual(state.folders, data.folders)
      assert.deepEqual(state.readLinks, data.readLinks)
      assert.equal(state.starredItems[0].title, 'Saved')
      assert.equal(state.starredItems[0].content, '<p>Saved body</p>')
      assert.equal(state.starredItems[0].isStarred, true)
      assert.equal('summary' in state.starredItems[0], false)
      assert.equal(state.hasHydrated, true)
      assert.equal(JSON.parse(saved).version, 2)
      assert.equal('summaries' in JSON.parse(saved).state, false)
    } finally {
      if (previousWindow === undefined) delete global.window
      else global.window = previousWindow
    }
  })
}
