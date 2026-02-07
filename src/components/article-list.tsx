'use client'

import { useState, useMemo, useCallback } from 'react'
import { Rss, FileText, Star, ArrowUpDown } from 'lucide-react'
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
  const selectedArticleId = useUIStore((s) => s.selectedArticleId)
  const filterMode = useUIStore((s) => s.filterMode)
  const sortOrder = useUIStore((s) => s.sortOrder)
  const setSelectedArticle = useUIStore((s) => s.setSelectedArticle)
  const setSortOrder = useUIStore((s) => s.setSortOrder)

  const [unreadFilter, setUnreadFilter] = useLocalUnreadFilter()

  const selectedFeed = useMemo(
    () => feeds.find((f) => f.id === selectedFeedId),
    [feeds, selectedFeedId]
  )

  const feedNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const feed of feeds) {
      map.set(feed.id, feed.title)
    }
    return map
  }, [feeds])

  const headerTitle = useMemo(() => {
    if (filterMode === 'starred') return 'Starred'
    if (selectedFeed) return selectedFeed.title
    return 'All Articles'
  }, [filterMode, selectedFeed])

  const headerDescription = useMemo(() => {
    if (selectedFeed) return selectedFeed.description
    return null
  }, [selectedFeed])

  const articles = useMemo(() => {
    let items: FeedItemDisplay[] = []

    if (filterMode === 'starred') {
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
    } else {
      items = feeds.flatMap((f) =>
        (f.items ?? []).map((i) => ({ ...i, feedId: f.id, imageUrl: i.imageUrl ?? undefined }))
      )
    }

    if (unreadFilter && filterMode !== 'starred') {
      items = items.filter((i) => !i.isRead)
    }

    items.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime()
      const dateB = new Date(b.pubDate).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return items
  }, [feeds, selectedFeedId, selectedFeed, filterMode, sortOrder, unreadFilter])

  const showFeedName = filterMode === 'starred' || !selectedFeedId

  const handleArticleClick = useCallback(
    async (article: FeedItemDisplay) => {
      setSelectedArticle(article.id)
      if (!article.isRead) {
        await itemActions.markAsRead(article.id)
      }
    },
    [setSelectedArticle]
  )

  const handleStarClick = useCallback(
    async (e: React.MouseEvent, articleId: string, isStarred: boolean) => {
      e.stopPropagation()
      await itemActions.toggleStar(articleId, isStarred)
    },
    []
  )

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
        <h2
          className="text-lg font-bold leading-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {headerTitle}
        </h2>
        {headerDescription && (
          <p
            className="mt-0.5 truncate text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {headerDescription}
          </p>
        )}

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

      {/* Articles */}
      <div className="flex-1 overflow-y-auto">
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
          articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isSelected={article.id === selectedArticleId}
              showFeedName={showFeedName}
              feedName={feedNameMap.get(article.feedId)}
              onSelect={handleArticleClick}
              onStarClick={handleStarClick}
            />
          ))
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

function ArticleCard({
  article,
  isSelected,
  showFeedName,
  feedName,
  onSelect,
  onStarClick,
}: {
  article: FeedItemDisplay
  isSelected: boolean
  showFeedName: boolean
  feedName: string | undefined
  onSelect: (article: FeedItemDisplay) => void
  onStarClick: (e: React.MouseEvent, articleId: string, isStarred: boolean) => void
}) {
  return (
    <div
      onClick={() => onSelect(article)}
      className="group relative flex cursor-pointer gap-3 border-b px-4 py-3 transition-colors"
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
      <div className="mt-2 shrink-0">
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
          <span>{formatRelativeDate(article.pubDate)}</span>
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

      {/* Star button */}
      <button
        onClick={(e) => onStarClick(e, article.id, article.isStarred)}
        className="absolute right-2 top-2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          opacity: article.isStarred ? 1 : undefined,
          color: article.isStarred
            ? 'var(--color-star)'
            : 'var(--color-text-tertiary)',
        }}
      >
        <Star
          size={14}
          fill={article.isStarred ? 'var(--color-star)' : 'none'}
        />
      </button>
    </div>
  )
}

/** Local state hook for the unread-only filter toggle */
function useLocalUnreadFilter(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(false)
  return [value, setValue]
}
