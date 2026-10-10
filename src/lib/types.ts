export interface Feed {
  id: string
  title: string
  url: string
  link: string
  description: string
  imageUrl?: string
  folderId: string | null
  lastFetched: string | null
  items: FeedItem[]
}

export interface FeedItem {
  id: string
  feedId: string
  title: string
  link: string
  content: string
  contentSnippet: string
  author: string
  pubDate: string
  imageUrl?: string
  isRead: boolean
  isStarred: boolean
}

export interface Folder {
  id: string
  name: string
  isExpanded: boolean
  sortBy?: string
}

export interface OPMLOutline {
  title: string
  xmlUrl: string
  htmlUrl?: string
  folder?: string
}
