import type { Feed, FeedItem } from './types'
import { decodeHtmlEntities } from './utils'
import { readXMLText, type XMLText } from './xml-text'

interface RSSChannel {
  title?: XMLText
  link?: XMLText
  description?: XMLText
  image?: { url?: XMLText }
  item?: RSSItem | RSSItem[]
}

interface RSSItem {
  title?: XMLText
  link?: XMLText
  description?: XMLText
  'content:encoded'?: XMLText
  author?: XMLText
  'dc:creator'?: XMLText
  pubDate?: XMLText
  guid?: string | { '#text': string }
  enclosure?: { '@_url'?: string; '@_type'?: string }
  'media:content'?: { '@_url'?: string }
  'media:thumbnail'?: { '@_url'?: string }
}

interface AtomEntry {
  title?: XMLText
  link?: { '@_href'?: string } | Array<{ '@_href'?: string; '@_rel'?: string }>
  summary?: XMLText
  content?: XMLText
  author?: { name?: XMLText }
  updated?: XMLText
  published?: XMLText
  id?: string
  'media:content'?: { '@_url'?: string }
  'media:thumbnail'?: { '@_url'?: string }
}

interface AtomFeed {
  title?: XMLText
  link?: { '@_href'?: string } | Array<{ '@_href'?: string; '@_rel'?: string }>
  subtitle?: XMLText
  icon?: XMLText
  logo?: XMLText
  entry?: AtomEntry | AtomEntry[]
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
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

  const contentStr = readXMLText((item as RSSItem)['content:encoded'])
    || readXMLText((item as RSSItem).description)
    || readXMLText((item as AtomEntry).content)
  if (contentStr) {
    const imgMatch = contentStr.match(/<img[^>]+src=["']([^"']+)["']/)
    if (imgMatch) return resolveUrl(imgMatch[1], baseUrl)
  }
  return undefined
}

function stripHtml(html: unknown): string {
  if (typeof html !== 'string') return ''
  return decodeHtmlEntities(
    html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  )
}

function getAtomLink(link: AtomFeed['link'] | AtomEntry['link']): string {
  if (!link) return ''
  if (Array.isArray(link)) {
    const alternate = link.find((l) => l['@_rel'] === 'alternate' || !l['@_rel'])
    return alternate?.['@_href'] ?? link[0]?.['@_href'] ?? ''
  }
  return link['@_href'] ?? ''
}

function parseRSSItems(items: RSSItem[], feedId: string, baseUrl: string): FeedItem[] {
  return items.map((item) => {
    // Handle CDATA wrapped content
    const rawContentEncoded = readXMLText(item['content:encoded'])
    const rawDescription = readXMLText(item.description)
    const rawContent = rawContentEncoded || rawDescription
    const content = rawContent ? resolveContentUrls(rawContent, baseUrl) : ''
    return {
      id: generateId(),
      feedId,
      title: decodeHtmlEntities(readXMLText(item.title)) || 'Untitled',
      link: readXMLText(item.link),
      content,
      contentSnippet: stripHtml(content).slice(0, 200),
      author: readXMLText(item.author) || readXMLText(item['dc:creator']) || '',
      pubDate: readXMLText(item.pubDate) || '',
      imageUrl: extractImageUrl(item, baseUrl),
      isRead: false,
      isStarred: false,
    } satisfies FeedItem
  })
}

function parseAtomEntries(entries: AtomEntry[], feedId: string, baseUrl: string): FeedItem[] {
  return entries.map((entry) => {
    const rawContent = readXMLText(entry.content) || readXMLText(entry.summary)
    const content = typeof rawContent === 'string' ? resolveContentUrls(rawContent, baseUrl) : ''
    return {
      id: generateId(),
      feedId,
      title: decodeHtmlEntities(readXMLText(entry.title)) || 'Untitled',
      link: getAtomLink(entry.link as AtomEntry['link']),
      content,
      contentSnippet: stripHtml(content).slice(0, 200),
      author: readXMLText(entry.author?.name),
      pubDate: readXMLText(entry.updated) || readXMLText(entry.published),
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
    signal: AbortSignal.timeout(8000),
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
    const baseUrl = readXMLText(channel.link) || url
    const rawItems = channel.item
      ? Array.isArray(channel.item)
        ? channel.item
        : [channel.item]
      : []

    return {
      id: feedId,
      title: decodeHtmlEntities(readXMLText(channel.title)) || 'Unknown Feed',
      url,
      link: readXMLText(channel.link),
      description: readXMLText(channel.description),
      imageUrl: resolveUrl(readXMLText(channel.image?.url), baseUrl),
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
      title: decodeHtmlEntities(readXMLText(atomFeed.title)) || 'Unknown Feed',
      url,
      link: getAtomLink(atomFeed.link),
      description: readXMLText(atomFeed.subtitle) || '',
      imageUrl: resolveUrl(readXMLText(atomFeed.icon) || readXMLText(atomFeed.logo), baseUrl),
      folderId: null,
      lastFetched: new Date().toISOString(),
      items: parseAtomEntries(rawEntries, feedId, baseUrl),
    }
  }

  // RDF / RSS 1.0
  if (parsed['rdf:RDF']) {
    const rdf = parsed['rdf:RDF']
    const channel: RSSChannel = rdf.channel ?? {}
    const baseUrl = readXMLText(channel.link) || url
    const rawItems = rdf.item
      ? Array.isArray(rdf.item)
        ? rdf.item
        : [rdf.item]
      : []

    return {
      id: feedId,
      title: decodeHtmlEntities(readXMLText(channel.title)) || 'Unknown Feed',
      url,
      link: readXMLText(channel.link),
      description: readXMLText(channel.description),
      imageUrl: undefined,
      folderId: null,
      lastFetched: new Date().toISOString(),
      items: parseRSSItems(rawItems, feedId, baseUrl),
    }
  }

  throw new Error('Unable to parse feed: unsupported format')
}
