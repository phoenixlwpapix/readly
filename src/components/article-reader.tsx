'use client'

import { useMemo, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Star,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Type,
} from 'lucide-react'
import { useUIStore, type FontSize } from '@/lib/ui-store'
import { useFeeds, itemActions } from '@/lib/feed-store'
import { useAiSummary } from '@/hooks/use-ai-summary'
import { formatRelativeDate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { WelcomeScreen } from '@/components/welcome-screen'

export function ArticleReader() {
  const { feeds } = useFeeds()
  const selectedArticleId = useUIStore((s) => s.selectedArticleId)
  const setSelectedArticle = useUIStore((s) => s.setSelectedArticle)
  const setSelectedFeed = useUIStore((s) => s.setSelectedFeed)
  const setFilterMode = useUIStore((s) => s.setFilterMode)
  const fontSize = useUIStore((s) => s.fontSize)
  const setFontSize = useUIStore((s) => s.setFontSize)

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

  // Process article content to fix media blocked by Referer checks
  const processedContent = useMemo(() => {
    if (!article?.content) return ''
    return article.content
      // Add referrerpolicy to <img>
      .replace(/<img\s+([^>]*?)\/?>/gi, (match, attrs) => {
        if (/referrerpolicy/i.test(attrs)) return match
        return `<img ${attrs} referrerpolicy="no-referrer" />`
      })
      // Add referrerpolicy to <video>
      .replace(/<video\s+([^>]*?)(\/?>)/gi, (match, attrs, close) => {
        if (/referrerpolicy/i.test(attrs)) return match
        return `<video ${attrs} referrerpolicy="no-referrer"${close}`
      })
      // Add referrerpolicy to <source> inside <video>
      .replace(/<source\s+([^>]*?)\/?>/gi, (match, attrs) => {
        if (/referrerpolicy/i.test(attrs)) return match
        return `<source ${attrs} referrerpolicy="no-referrer" />`
      })
      // Add referrerpolicy to <iframe> (YouTube, Vimeo, etc.)
      .replace(/<iframe\s+([^>]*?)>/gi, (match, attrs) => {
        if (/referrerpolicy/i.test(attrs)) return match
        return `<iframe ${attrs} referrerpolicy="no-referrer">`
      })
  }, [article?.content])

  // Hide images that fail to load (403, 404, etc.) and remove their src to stop retries
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const handler = (e: Event) => {
      const img = e.target as HTMLImageElement
      if (img.tagName === 'IMG') {
        img.removeAttribute('src')
        img.removeAttribute('srcset')
        img.style.display = 'none'
      }
    }

    el.addEventListener('error', handler, true)
    return () => el.removeEventListener('error', handler, true)
  }, [processedContent])

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
    return <WelcomeScreen />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div
        className="flex shrink-0 items-center gap-1 border-b px-2 py-2 sm:px-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <ToolbarButton
          onClick={() => setSelectedArticle(null)}
          icon={
            <ArrowLeft
              size={16}
              style={{ color: 'var(--color-text-secondary)' }}
            />
          }
          className="lg:hidden"
        />

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

        {/* Font Size Selector */}
        <div className="flex items-center gap-0.5 rounded-lg border px-1 py-0.5" style={{ borderColor: 'var(--color-border)' }}>
          <Type size={14} style={{ color: 'var(--color-text-tertiary)' }} className="mx-1" />
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className="rounded px-2 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: fontSize === size ? 'var(--color-accent-light)' : 'transparent',
                color: fontSize === size ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (fontSize !== size) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = fontSize === size ? 'var(--color-accent-light)' : 'transparent'
              }}
            >
              {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
            </button>
          ))}
        </div>

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
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
       <div className="mx-auto max-w-2xl">
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
          {feedName && (
            <button
              onClick={() => {
                setFilterMode('all')
                setSelectedFeed(article.feedId)
              }}
              className="cursor-pointer transition-colors"
              style={{ color: 'var(--color-accent)' }}
            >
              {feedName}
            </button>
          )}
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
                className="article-content leading-relaxed"
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: fontSize === 'small' ? '0.875rem' : fontSize === 'medium' ? '1rem' : '1.125rem',
                }}
              >
                <ReactMarkdown>{displaySummary}</ReactMarkdown>
                {isSummarizing && (
                  <span
                    className="ml-0.5 inline-block h-4 w-0.5 animate-pulse align-middle"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  />
                )}
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
          ref={contentRef}
          className={`article-content article-content--${fontSize}`}
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: '1.75',
          }}
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />

        {/* Read Original Article button */}
        <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => window.open(article.link, '_blank', 'noopener')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all duration-200"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
              e.currentTarget.style.borderColor = 'var(--color-text-tertiary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = 'var(--color-border)'
            }}
          >
            <ExternalLink size={16} />
            Read Original Article
          </button>
        </div>
       </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  icon,
  label,
  className = '',
}: {
  onClick: () => void
  icon: React.ReactNode
  label?: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs transition-colors sm:py-1.5 ${className}`}
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
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  )
}
