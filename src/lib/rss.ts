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
  summary?: string
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
  subtitle?: string
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

function extractImageUrl(item: RSSItem | AtomEntry): string | undefined {
  if ('enclosure' in item) {
    const rssItem = item as RSSItem
    if (rssItem.enclosure?.['@_type']?.startsWith('image/')) {
      return rssItem.enclosure['@_url']
    }
  }
  const mediaContent = (item as Record<string, unknown>)['media:content'] as { '@_url'?: string } | undefined
  if (mediaContent?.['@_url']) return mediaContent['@_url']
  const mediaThumbnail = (item as Record<string, unknown>)['media:thumbnail'] as { '@_url'?: string } | undefined
  if (mediaThumbnail?.['@_url']) return mediaThumbnail['@_url']

  const content = ('content:encoded' in item)
    ? (item as RSSItem)['content:encoded']
    : extractText((item as AtomEntry).content)
  if (content) {
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/)
    if (imgMatch) return imgMatch[1]
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

function parseRSSItems(items: RSSItem[], feedId: string): FeedItem[] {
  return items.map((item) => {
    const rawContent = item['content:encoded'] ?? item.description
    const content = typeof rawContent === 'string' ? rawContent : ''
    const guidText = typeof item.guid === 'object' ? item.guid?.['#text'] : item.guid
    return {
      id: generateId(),
      feedId,
      title: item.title ?? 'Untitled',
      link: item.link ?? '',
      content,
      contentSnippet: stripHtml(content).slice(0, 200),
      author: item.author ?? item['dc:creator'] ?? '',
      pubDate: item.pubDate ?? '',
      imageUrl: extractImageUrl(item),
      isRead: false,
      isStarred: false,
    } satisfies FeedItem
  })
}

function parseAtomEntries(entries: AtomEntry[], feedId: string): FeedItem[] {
  return entries.map((entry) => {
    const rawContent = extractText(entry.content) || entry.summary
    const content = typeof rawContent === 'string' ? rawContent : ''
    return {
      id: generateId(),
      feedId,
      title: extractText(entry.title) || 'Untitled',
      link: getAtomLink(entry.link as AtomEntry['link']),
      content,
      contentSnippet: stripHtml(content).slice(0, 200),
      author: entry.author?.name ?? '',
      pubDate: entry.updated ?? entry.published ?? '',
      imageUrl: extractImageUrl(entry),
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
  })
  const parsed = parser.parse(xml)

  const feedId = generateId()

  // RSS 2.0
  if (parsed.rss?.channel) {
    const channel: RSSChannel = parsed.rss.channel
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
      imageUrl: channel.image?.url,
      folderId: null,
      lastFetched: new Date().toISOString(),
      items: parseRSSItems(rawItems, feedId),
    }
  }

  // Atom
  if (parsed.feed) {
    const atomFeed: AtomFeed = parsed.feed
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
      description: atomFeed.subtitle ?? '',
      imageUrl: atomFeed.icon ?? atomFeed.logo,
      folderId: null,
      lastFetched: new Date().toISOString(),
      items: parseAtomEntries(rawEntries, feedId),
    }
  }

  // RDF / RSS 1.0
  if (parsed['rdf:RDF']) {
    const rdf = parsed['rdf:RDF']
    const channel = rdf.channel ?? {}
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
      items: parseRSSItems(rawItems, feedId),
    }
  }

  throw new Error('Unable to parse feed: unsupported format')
}
