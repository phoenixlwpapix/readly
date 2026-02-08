import type { Feed, FeedItem } from './types'

interface RSSChannel {
  title?: string
  link?: string
  description?: string
  image?: { url?: string }
  item?: RSSItem | RSSItem[]
}

interface RSSItem {
  title?: string
  link?: string
  description?: string
  'content:encoded'?: string
  author?: string
  'dc:creator'?: string
  pubDate?: string
  guid?: string | { '#text': string }
  enclosure?: { '@_url'?: string; '@_type'?: string }
  'media:content'?: { '@_url'?: string }
  'media:thumbnail'?: { '@_url'?: string }
}

interface AtomEntry {
  title?: string | { '#text': string }
  link?: { '@_href'?: string } | Array<{ '@_href'?: string; '@_rel'?: string }>
  summary?: string | { '#text': string }
  content?: string | { '#text': string }
  author?: { name?: string }
  updated?: string
  published?: string
  id?: string
  'media:content'?: { '@_url'?: string }
  'media:thumbnail'?: { '@_url'?: string }
}

interface AtomFeed {
  title?: string | { '#text': string }
  link?: { '@_href'?: string } | Array<{ '@_href'?: string; '@_rel'?: string }>
  subtitle?: string | { '#text': string }
  icon?: string
  logo?: string
  entry?: AtomEntry | AtomEntry[]
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)['#text'])
  }
  return ''
}

function resolveUrl(relative: string | undefined, base: string): string | undefined {
  if (!relative) return undefined
  if (/^https?:\/\//i.test(relative)) return relative
  try {
    return new URL(relative, base).href
  } catch {
    return relative
  }
}

function resolveContentUrls(html: string, baseUrl: string): string {
  return html.replace(
    /(<img\s[^>]*?src=["'])([^"']+)(["'])/gi,
    (match, pre, src, post) => {
      if (/^https?:\/\//i.test(src)) return match
      const abs = resolveUrl(src, baseUrl)
      return abs ? `${pre}${abs}${post}` : match
    }
  )
}

function extractImageUrl(item: RSSItem | AtomEntry, baseUrl: string): string | undefined {
  if ('enclosure' in item) {
    const rssItem = item as RSSItem
    if (rssItem.enclosure?.['@_type']?.startsWith('image/')) {
      return resolveUrl(rssItem.enclosure['@_url'], baseUrl)
    }
  }
  const mediaContent = (item as Record<string, unknown>)['media:content'] as { '@_url'?: string } | undefined
  if (mediaContent?.['@_url']) return resolveUrl(mediaContent['@_url'], baseUrl)
  const mediaThumbnail = (item as Record<string, unknown>)['media:thumbnail'] as { '@_url'?: string } | undefined
  if (mediaThumbnail?.['@_url']) return resolveUrl(mediaThumbnail['@_url'], baseUrl)

  // Extract content for image search, handle CDATA format
  let contentStr = ''
  if ('content:encoded' in item) {
    const encoded = (item as RSSItem)['content:encoded']
    if (typeof encoded === 'string') {
      contentStr = encoded
    } else if (encoded && typeof encoded === 'object' && '__cdata' in (encoded as Record<string, unknown>)) {
      contentStr = String((encoded as Record<string, unknown>).__cdata)
    }
  }
  if (!contentStr && 'description' in item) {
    const desc = (item as RSSItem).description
    if (typeof desc === 'string') {
      contentStr = desc
    } else if (desc && typeof desc === 'object' && '__cdata' in (desc as Record<string, unknown>)) {
      contentStr = String((desc as Record<string, unknown>).__cdata)
    }
  }
  if (!contentStr) {
    contentStr = extractText((item as AtomEntry).content)
  }
  if (contentStr) {
    const imgMatch = contentStr.match(/<img[^>]+src=["']([^"']+)["']/)
    if (imgMatch) return resolveUrl(imgMatch[1], baseUrl)
  }
  return undefined
}

function stripHtml(html: unknown): string {
  if (typeof html !== 'string') return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function getAtomLink(link: AtomFeed['link'] | AtomEntry['link']): string {
  if (!link) return ''
  if (Array.isArray(link)) {
    const alternate = link.find((l) => l['@_rel'] === 'alternate' || !l['@_rel'])
    return alternate?.['@_href'] ?? link[0]?.['@_href'] ?? ''
  }
  return link['@_href'] ?? ''
}

function extractCData(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    // Handle CDATA wrapped content: { __cdata: 'content' }
    if ('__cdata' in obj && typeof obj.__cdata === 'string') {
      return obj.__cdata
    }
    // Handle #text
    if ('#text' in obj && typeof obj['#text'] === 'string') {
      return obj['#text']
    }
  }
  return ''
}

function parseRSSItems(items: RSSItem[], feedId: string, baseUrl: string): FeedItem[] {
  return items.map((item) => {
    // Handle CDATA wrapped content
    const rawContentEncoded = extractCData(item['content:encoded'])
    const rawDescription = extractCData(item.description)
    const rawContent = rawContentEncoded || rawDescription
    const content = rawContent ? resolveContentUrls(rawContent, baseUrl) : ''
    const guidText = typeof item.guid === 'object' ? item.guid?.['#text'] : item.guid
    return {
      id: generateId(),
      feedId,
      title: extractCData(item.title) || 'Untitled',
      link: typeof item.link === 'string' ? item.link : '',
      content,
      contentSnippet: stripHtml(content).slice(0, 200),
      author: extractCData(item.author) || extractCData(item['dc:creator']) || '',
      pubDate: extractCData(item.pubDate) || '',
      imageUrl: extractImageUrl(item, baseUrl),
      isRead: false,
      isStarred: false,
    } satisfies FeedItem
  })
}

function parseAtomEntries(entries: AtomEntry[], feedId: string, baseUrl: string): FeedItem[] {
  return entries.map((entry) => {
    const rawContent = extractText(entry.content) || extractText(entry.summary)
    const content = typeof rawContent === 'string' ? resolveContentUrls(rawContent, baseUrl) : ''
    return {
      id: generateId(),
      feedId,
      title: extractText(entry.title) || 'Untitled',
      link: getAtomLink(entry.link as AtomEntry['link']),
      content,
      contentSnippet: stripHtml(content).slice(0, 200),
      author: entry.author?.name ?? '',
      pubDate: entry.updated ?? entry.published ?? '',
      imageUrl: extractImageUrl(entry, baseUrl),
      isRead: false,
      isStarred: false,
    } satisfies FeedItem
  })
}

export async function fetchAndParseFeed(url: string): Promise<Feed> {
  const { XMLParser } = await import('fast-xml-parser')

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Readly RSS Reader/1.0' },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch feed: ${res.status} ${res.statusText}`)
  }

  const xml = await res.text()
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '__cdata',
  })
  const parsed = parser.parse(xml)

  const feedId = generateId()

  // RSS 2.0
  if (parsed.rss?.channel) {
    const channel: RSSChannel = parsed.rss.channel
    const baseUrl = channel.link || url
    const rawItems = channel.item
      ? Array.isArray(channel.item)
        ? channel.item
        : [channel.item]
      : []

    return {
      id: feedId,
      title: channel.title ?? 'Unknown Feed',
      url,
      link: channel.link ?? '',
      description: channel.description ?? '',
      imageUrl: resolveUrl(channel.image?.url, baseUrl),
      folderId: null,
      lastFetched: new Date().toISOString(),
      items: parseRSSItems(rawItems, feedId, baseUrl),
    }
  }

  // Atom
  if (parsed.feed) {
    const atomFeed: AtomFeed = parsed.feed
    const baseUrl = getAtomLink(atomFeed.link) || url
    const rawEntries = atomFeed.entry
      ? Array.isArray(atomFeed.entry)
        ? atomFeed.entry
        : [atomFeed.entry]
      : []

    return {
      id: feedId,
      title: extractText(atomFeed.title) || 'Unknown Feed',
      url,
      link: getAtomLink(atomFeed.link),
      description: extractText(atomFeed.subtitle) || '',
      imageUrl: resolveUrl(atomFeed.icon ?? atomFeed.logo, baseUrl),
      folderId: null,
      lastFetched: new Date().toISOString(),
      items: parseAtomEntries(rawEntries, feedId, baseUrl),
    }
  }

  // RDF / RSS 1.0
  if (parsed['rdf:RDF']) {
    const rdf = parsed['rdf:RDF']
    const channel = rdf.channel ?? {}
    const baseUrl = channel.link || url
    const rawItems = rdf.item
      ? Array.isArray(rdf.item)
        ? rdf.item
        : [rdf.item]
      : []

    return {
      id: feedId,
      title: channel.title ?? 'Unknown Feed',
      url,
      link: channel.link ?? '',
      description: channel.description ?? '',
      imageUrl: undefined,
      folderId: null,
      lastFetched: new Date().toISOString(),
      items: parseRSSItems(rawItems, feedId, baseUrl),
    }
  }

  throw new Error('Unable to parse feed: unsupported format')
}
