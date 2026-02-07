'use server'

import { fetchAndParseFeed } from '@/lib/rss'
import { parseOPML as parseOPMLFile } from '@/lib/opml'
import type { Feed, OPMLOutline } from '@/lib/types'

export async function fetchFeed(url: string): Promise<Feed> {
  try {
    const feed = await fetchAndParseFeed(url)
    return feed
  } catch (error) {
    throw new Error(
      `Failed to fetch feed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export async function parseOPMLAction(
  fileContent: string
): Promise<OPMLOutline[]> {
  try {
    const outlines = await parseOPMLFile(fileContent)
    return outlines
  } catch (error) {
    throw new Error(
      `Failed to parse OPML: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export async function refreshFeed(feedUrl: string): Promise<Feed> {
  return fetchFeed(feedUrl)
}
