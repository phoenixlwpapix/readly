'use client'

import { useMemo, useEffect } from 'react'
import {
  BookOpen,
  Star,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { useUIStore } from '@/lib/ui-store'
import { useFeeds, itemActions } from '@/lib/feed-store'
import { useAiSummary } from '@/hooks/use-ai-summary'
import { formatRelativeDate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

export function ArticleReader() {
  const { feeds } = useFeeds()
  const selectedArticleId = useUIStore((s) => s.selectedArticleId)

  const { summary: newSummary, isLoading: isSummarizing, error: summaryError, summarize, stop, reset } = useAiSummary()

  // Reset AI summary when switching articles
  useEffect(() => {
    reset()
  }, [selectedArticleId, reset])

  const article = useMemo(() => {
    for (const feed of feeds) {
      const item = feed.items?.find((i) => i.id === selectedArticleId)
      if (item) return { ...item, feedId: feed.id }
    }
    return null
  }, [feeds, selectedArticleId])

  const feedName = useMemo(() => {
    if (!article) return ''
    const feed = feeds.find((f) => f.id === article.feedId)
    return feed?.title ?? ''
  }, [feeds, article])

  // Use saved summary from DB, or newly generated one
  const displaySummary = article?.summary || newSummary

  // Save summary to DB when generation completes
  const handleSummarize = async () => {
    if (!article) return
    if (isSummarizing) {
      stop()
    } else {
      const result = await summarize(article.title, article.content)
      if (result && article.id) {
        await itemActions.saveSummary(article.id, result)
      }
    }
  }

  const handleToggleStar = async () => {
    if (article) {
      await itemActions.toggleStar(article.id, article.isStarred)
    }
  }

  const handleMarkAsRead = async () => {
    if (article) {
      await itemActions.markAsRead(article.id)
    }
  }

  const handleMarkAsUnread = async () => {
    if (article) {
      await itemActions.markAsUnread(article.id)
    }
  }

  if (!article) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <BookOpen
          size={64}
          strokeWidth={1}
          style={{ color: 'var(--color-text-tertiary)' }}
        />
        <p
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Select an article to read
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Choose an article from the list to start reading
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div
        className="flex shrink-0 items-center gap-1 border-b px-4 py-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <ToolbarButton
          onClick={handleToggleStar}
          icon={
            <Star
              size={16}
              fill={article.isStarred ? 'var(--color-star)' : 'none'}
              style={{
                color: article.isStarred
                  ? 'var(--color-star)'
                  : 'var(--color-text-secondary)',
              }}
            />
          }
        />

        <ToolbarButton
          onClick={() =>
            article.isRead
              ? handleMarkAsUnread()
              : handleMarkAsRead()
          }
          icon={
            article.isRead ? (
              <EyeOff size={16} style={{ color: 'var(--color-text-secondary)' }} />
            ) : (
              <Eye size={16} style={{ color: 'var(--color-text-secondary)' }} />
            )
          }
          label={article.isRead ? 'Mark unread' : 'Mark read'}
        />

        <ToolbarButton
          onClick={() => window.open(article.link, '_blank', 'noopener')}
          icon={
            <ExternalLink
              size={16}
              style={{ color: 'var(--color-text-secondary)' }}
            />
          }
        />

        <div className="flex-1" />

        <button
          onClick={handleSummarize}
          disabled={!!article.summary && !isSummarizing}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: isSummarizing
              ? 'var(--color-bg-tertiary)'
              : 'var(--color-accent-light)',
            color: 'var(--color-accent)',
          }}
          onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor =
            isSummarizing
              ? 'var(--color-bg-hover)'
              : 'var(--color-accent-light)')
          }
          onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor =
            isSummarizing
              ? 'var(--color-bg-tertiary)'
              : 'var(--color-accent-light)')
          }
        >
          <Sparkles size={14} />
          {isSummarizing ? 'Stop' : article.summary ? 'Summarized' : 'Summarize'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Article header */}
        <h1
          className="text-2xl font-bold leading-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {article.title}
        </h1>

        <div
          className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {article.author && <span>{article.author}</span>}
          {article.author && feedName && (
            <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
          )}
          {feedName && <span>{feedName}</span>}
          {(article.author || feedName) && article.pubDate && (
            <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
          )}
          {article.pubDate && (
            <span style={{ color: 'var(--color-text-tertiary)' }}>
              {formatRelativeDate(article.pubDate)}
            </span>
          )}
        </div>

        <div
          className="my-4 h-px"
          style={{ backgroundColor: 'var(--color-border)' }}
        />

        {/* AI Summary section */}
        {(displaySummary || isSummarizing || summaryError) && (
          <div
            className="mb-6 rounded-xl p-4"
            style={{ backgroundColor: 'var(--color-accent-light)' }}
          >
            <div
              className="mb-2 flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: 'var(--color-accent)' }}
            >
              <Sparkles size={14} />
              AI Summary
              {article.summary && !isSummarizing && (
                <span className="ml-auto text-xs font-normal opacity-60">Saved</span>
              )}
            </div>

            {isSummarizing && !newSummary && (
              <div className="space-y-2">
                <div
                  className="h-3 w-full animate-pulse rounded"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                />
                <div
                  className="h-3 w-4/5 animate-pulse rounded"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                />
                <div
                  className="h-3 w-3/5 animate-pulse rounded"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                />
              </div>
            )}

            {displaySummary && (
              <div
                className="prose prose-sm max-w-none text-sm leading-relaxed dark:prose-invert"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <ReactMarkdown>{displaySummary}</ReactMarkdown>
              </div>
            )}

            {summaryError && (
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--color-danger)' }}>
                  Failed to generate summary
                </span>
                <button
                  onClick={() => summarize(article.title, article.content)}
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors"
                  style={{ color: 'var(--color-accent)' }}
                  onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    'var(--color-bg-tertiary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                >
                  <RotateCcw size={12} />
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Article body */}
        <div
          className="article-content"
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: '1.75',
          }}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void
  icon: React.ReactNode
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors"
      style={{
        color: 'var(--color-text-secondary)',
        backgroundColor: 'transparent',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = 'transparent')
      }
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  )
}
