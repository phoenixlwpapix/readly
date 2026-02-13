'use client'

import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef, memo } from 'react'
import { Rss, FileText, ArrowUpDown, Menu, Search, X } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useUIStore } from '@/lib/ui-store'
import { useFeeds, itemActions } from '@/lib/feed-store'
import { formatRelativeDate, cn } from '@/lib/utils'

interface FeedItemDisplay {
  id: string
  feedId: string
  title: string
  link: string
  content: string
  contentSnippet: string
  author: string
  pubDate: string
  imageUrl?: string | null
  isRead: boolean
  isStarred: boolean
}

export function ArticleList() {
  const { feeds, isLoading } = useFeeds()

  const selectedFeedId = useUIStore((s) => s.selectedFeedId)
  const selectedFolderId = useUIStore((s) => s.selectedFolderId)
  const selectedArticleId = useUIStore((s) => s.selectedArticleId)
  const filterMode = useUIStore((s) => s.filterMode)
  const sortOrder = useUIStore((s) => s.sortOrder)
  const setSelectedArticle = useUIStore((s) => s.setSelectedArticle)
  const setSortOrder = useUIStore((s) => s.setSortOrder)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const [unreadFilter, setUnreadFilter] = useLocalUnreadFilter()

  const selectedFeed = useMemo(
    () => feeds.find((f) => f.id === selectedFeedId),
    [feeds, selectedFeedId]
  )

  const folderFeeds = useMemo(
    () => selectedFolderId ? feeds.filter((f) => f.folder?.id === selectedFolderId) : [],
    [feeds, selectedFolderId]
  )

  const feedNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const feed of feeds) {
      map.set(feed.id, feed.title)
    }
    return map
  }, [feeds])

  const isSearching = searchQuery.trim().length > 0

  const headerTitle = useMemo(() => {
    if (filterMode === 'starred') return 'Starred'
    if (selectedFeed) return selectedFeed.title
    if (selectedFolderId) {
      const folder = folderFeeds[0]?.folder
      return folder?.name ?? 'Folder'
    }
    return 'All Articles'
  }, [filterMode, selectedFeed, selectedFolderId, folderFeeds])

  const headerDescription = useMemo(() => {
    if (selectedFeed) return selectedFeed.description
    if (selectedFolderId && folderFeeds.length > 0) {
      return `${folderFeeds.length} feed${folderFeeds.length === 1 ? '' : 's'}`
    }
    return null
  }, [selectedFeed, selectedFolderId, folderFeeds])

  const articles = useMemo(() => {
    let items: FeedItemDisplay[] = []
    const query = searchQuery.trim().toLowerCase()

    if (query) {
      // Search mode: search across ALL feeds, ignoring current selection
      items = feeds.flatMap((f) =>
        (f.items ?? []).map((i) => ({ ...i, feedId: f.id, imageUrl: i.imageUrl ?? undefined }))
      )
      items = items.filter((i) => {
        const titleMatch = i.title.toLowerCase().includes(query)
        const feedMatch = feedNameMap.get(i.feedId)?.toLowerCase().includes(query) ?? false
        return titleMatch || feedMatch
      })
    } else if (filterMode === 'starred') {
      items = feeds.flatMap((f) =>
        (f.items ?? [])
          .filter((i) => i.isStarred)
          .map((i) => ({ ...i, feedId: f.id, imageUrl: i.imageUrl ?? undefined }))
      )
    } else if (selectedFeedId) {
      items = (selectedFeed?.items ?? []).map((i) => ({
        ...i,
        feedId: selectedFeedId,
        imageUrl: i.imageUrl ?? undefined
      }))
    } else if (selectedFolderId) {
      items = folderFeeds.flatMap((f) =>
        (f.items ?? []).map((i) => ({ ...i, feedId: f.id, imageUrl: i.imageUrl ?? undefined }))
      )
    } else {
      items = feeds.flatMap((f) =>
        (f.items ?? []).map((i) => ({ ...i, feedId: f.id, imageUrl: i.imageUrl ?? undefined }))
      )
    }

    if (unreadFilter && filterMode !== 'starred' && !query) {
      items = items.filter((i) => !i.isRead)
    }

    // Pre-compute timestamps to avoid repeated Date parsing in sort comparator
    const tsMap = new Map<string, number>()
    for (const item of items) {
      tsMap.set(item.id, new Date(item.pubDate).getTime() || 0)
    }

    items.sort((a, b) => {
      const tsA = tsMap.get(a.id)!
      const tsB = tsMap.get(b.id)!
      return sortOrder === 'newest' ? tsB - tsA : tsA - tsB
    })

    return items
  }, [feeds, selectedFeedId, selectedFeed, selectedFolderId, folderFeeds, filterMode, sortOrder, unreadFilter, searchQuery, feedNameMap])

  const showFeedName = isSearching || filterMode === 'starred' || (!selectedFeedId && !!selectedFolderId) || !selectedFeedId

  const handleArticleClick = useCallback(
    async (article: FeedItemDisplay) => {
      setSelectedArticle(article.id)
      if (!article.isRead) {
        await itemActions.markAsRead(article.id)
      }
    },
    [setSelectedArticle]
  )

  // Auto-select first article when feed, folder, or filter changes
  const prevFeedId = useRef(selectedFeedId)
  const prevFolderId = useRef(selectedFolderId)
  const prevFilterMode = useRef(filterMode)

  useEffect(() => {
    const feedChanged = prevFeedId.current !== selectedFeedId
    const folderChanged = prevFolderId.current !== selectedFolderId
    const filterChanged = prevFilterMode.current !== filterMode
    prevFeedId.current = selectedFeedId
    prevFolderId.current = selectedFolderId
    prevFilterMode.current = filterMode

    if ((feedChanged || folderChanged || filterChanged) && articles.length > 0) {
      setSelectedArticle(articles[0].id)
      if (!articles[0].isRead) {
        itemActions.markAsRead(articles[0].id)
      }
    }
  }, [selectedFeedId, selectedFolderId, filterMode, articles, setSelectedArticle])

  // Ctrl+K / ⌘+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Virtual list setup
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset scroll position when feed/folder/filter changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [selectedFeedId, selectedFolderId, filterMode])

  // Track article list identity to force virtualizer reset
  const articlesKey = useMemo(
    () => articles.map((a) => a.id).join(','),
    [articles]
  )
  const prevArticlesKey = useRef(articlesKey)

  const virtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 110,
    overscan: 5,
    getItemKey: (index) => articles[index]?.id ?? String(index),
  })

  // Force remeasure when articles change (sort/filter/feed switch)
  // useLayoutEffect ensures measurement happens before paint to prevent flicker
  useLayoutEffect(() => {
    if (prevArticlesKey.current !== articlesKey) {
      prevArticlesKey.current = articlesKey
      // Reset all measurements when the list changes
      virtualizer.measure()
    }
  }, [articlesKey, virtualizer])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (feeds.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Rss
          size={48}
          strokeWidth={1.5}
          style={{ color: 'var(--color-text-tertiary)' }}
        />
        <p
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          No feeds yet
        </p>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Add your first RSS feed to get started
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="shrink-0 border-b px-4 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="shrink-0 rounded-lg p-1.5 transition-colors lg:hidden"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-lg font-bold leading-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {isSearching ? `Search Results (${articles.length})` : headerTitle}
            </h2>
            {!isSearching && headerDescription && (
              <p
                className="mt-0.5 truncate text-xs"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {headerDescription}
              </p>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="relative mt-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-tertiary)' }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search articles... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border py-1.5 pl-8 pr-8 text-xs outline-none transition-colors focus:ring-1"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              // @ts-expect-error CSS custom property for ring color
              '--tw-ring-color': 'var(--color-accent)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Controls row */}
        <div className="mt-2 flex items-center gap-2">
          {/* Filter pills — only when not in starred mode */}
          {filterMode !== 'starred' && (
            <div
              className="flex rounded-lg p-0.5"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <FilterPill
                label="All"
                active={!unreadFilter}
                onClick={() => setUnreadFilter(false)}
              />
              <FilterPill
                label="Unread"
                active={unreadFilter}
                onClick={() => setUnreadFilter(true)}
              />
            </div>
          )}

          <div className="flex-1" />

          {/* Sort toggle */}
          <button
            onClick={() =>
              setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')
            }
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor =
              'var(--color-bg-tertiary)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <ArrowUpDown size={13} />
            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {/* Articles — virtualized */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {articles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <FileText
              size={48}
              strokeWidth={1.5}
              style={{ color: 'var(--color-text-tertiary)' }}
            />
            <p
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              No articles
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {unreadFilter
                ? 'All articles have been read'
                : 'This feed has no articles'}
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const article = articles[virtualRow.index]
              return (
                <div
                  key={article.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ArticleCard
                    article={article}
                    isSelected={article.id === selectedArticleId}
                    showFeedName={showFeedName}
                    feedName={feedNameMap.get(article.feedId)}
                    onSelect={handleArticleClick}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md px-3 py-1 text-xs font-medium transition-all"
      style={{
        backgroundColor: active ? 'var(--color-bg-primary)' : 'transparent',
        color: active
          ? 'var(--color-text-primary)'
          : 'var(--color-text-secondary)',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
      }}
    >
      {label}
    </button>
  )
}

const ArticleCard = memo(function ArticleCard({
  article,
  isSelected,
  showFeedName,
  feedName,
  onSelect,
}: {
  article: FeedItemDisplay
  isSelected: boolean
  showFeedName: boolean
  feedName: string | undefined
  onSelect: (article: FeedItemDisplay) => void
}) {
  return (
    <div
      onClick={() => onSelect(article)}
      className="flex cursor-pointer gap-3 border-b px-4 py-2.5 transition-colors"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: isSelected
          ? 'var(--color-bg-tertiary)'
          : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {/* Unread dot */}
      <div className="flex shrink-0 items-start pt-1.5">
        <div
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: article.isRead
              ? 'transparent'
              : 'var(--color-accent)',
          }}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'line-clamp-2 text-sm leading-snug',
            !article.isRead && 'font-semibold'
          )}
          style={{ color: 'var(--color-text-primary)' }}
        >
          {article.title}
        </p>

        <div className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {showFeedName && feedName && (
            <>
              <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {feedName}
              </span>
              <span>·</span>
            </>
          )}
          <span className="shrink-0">{formatRelativeDate(article.pubDate)}</span>
        </div>

        {article.contentSnippet && (
          <p
            className="mt-1 line-clamp-2 text-xs leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {article.contentSnippet}
          </p>
        )}
      </div>

      {/* Thumbnail */}
      {article.imageUrl && (
        <div className="shrink-0">
          <img
            src={article.imageUrl}
            alt=""
            className="h-12 w-12 rounded-md object-cover"
          />
        </div>
      )}
    </div>
  )
})

/** Local state hook for the unread-only filter toggle */
function useLocalUnreadFilter(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(false)
  return [value, setValue]
}
