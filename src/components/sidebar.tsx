'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Rss,
  Layers,
  Star,
  ChevronRight,
  ChevronDown,
  Plus,
  Upload,
  Sun,
  Moon,
  Trash2,
} from 'lucide-react'
import { useUIStore } from '@/lib/ui-store'
import { useFeeds, useFolders, feedActions, folderActions } from '@/lib/feed-store'
import { AddFeedDialog } from '@/components/add-feed-dialog'
import { ImportOPMLDialog } from '@/components/import-opml-dialog'

export function Sidebar() {
  const { feeds, isLoading: feedsLoading } = useFeeds()
  const { folders } = useFolders()

  const selectedFeedId = useUIStore((s) => s.selectedFeedId)
  const filterMode = useUIStore((s) => s.filterMode)
  const setSelectedFeed = useUIStore((s) => s.setSelectedFeed)
  const setFilterMode = useUIStore((s) => s.setFilterMode)

  const { theme, setTheme } = useTheme()
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [showImportOPML, setShowImportOPML] = useState(false)

  const allArticlesCount = feeds.reduce((sum, f) => sum + (f.items?.length ?? 0), 0)
  const starredCount = feeds.reduce(
    (sum, f) => sum + (f.items?.filter((i) => i.isStarred).length ?? 0),
    0
  )

  const uncategorizedFeeds = feeds.filter((f) => !f.folder)

  const getFeedsInFolder = (folderId: string) =>
    feeds.filter((f) => f.folder?.id === folderId)

  const getUnreadCount = (feedId: string) => {
    const feed = feeds.find((f) => f.id === feedId)
    return feed?.items?.filter((i) => !i.isRead).length ?? 0
  }

  const handleRemoveFeed = async (feedId: string) => {
    await feedActions.removeFeed(feedId)
  }

  const handleToggleFolder = async (folderId: string, isExpanded: boolean) => {
    await folderActions.toggleFolder(folderId, isExpanded)
  }

  if (feedsLoading) {
    return (
      <div className="flex h-full flex-col">
        <div
          className="flex items-center gap-2.5 border-b px-4 py-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Rss size={16} color="white" />
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Readly
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 border-b px-4 py-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Rss size={16} color="white" />
        </div>
        <span
          className="text-lg font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Readly
        </span>
      </div>

      {/* Navigation */}
      <nav className="mt-2 space-y-0.5 px-2">
        <button
          onClick={() => {
            setFilterMode('all')
            setSelectedFeed(null)
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor:
              filterMode === 'all' && !selectedFeedId
                ? 'var(--color-accent-light)'
                : 'transparent',
            color:
              filterMode === 'all' && !selectedFeedId
                ? 'var(--color-accent)'
                : 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!(filterMode === 'all' && !selectedFeedId)) {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (!(filterMode === 'all' && !selectedFeedId)) {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        >
          <Layers size={18} />
          <span className="flex-1 text-left">All Articles</span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {allArticlesCount}
          </span>
        </button>

        <button
          onClick={() => setFilterMode('starred')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor:
              filterMode === 'starred'
                ? 'var(--color-accent-light)'
                : 'transparent',
            color:
              filterMode === 'starred'
                ? 'var(--color-accent)'
                : 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (filterMode !== 'starred') {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (filterMode !== 'starred') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        >
          <Star size={18} />
          <span className="flex-1 text-left">Starred</span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {starredCount}
          </span>
        </button>
      </nav>

      {/* Divider */}
      <div
        className="mx-4 my-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      />

      {/* Feeds */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* Folders */}
        {folders.map((folder) => {
          const folderFeeds = getFeedsInFolder(folder.id)
          return (
            <div key={folder.id} className="mb-1">
              <button
                onClick={() => handleToggleFolder(folder.id, folder.isExpanded)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200"
                style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-bg-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {folder.isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <span className="flex-1 text-left">{folder.name}</span>
                <span className="text-xs font-normal">
                  {folderFeeds.length}
                </span>
              </button>
              {folder.isExpanded && (
                <div className="ml-2 space-y-0.5">
                  {folderFeeds.map((feed) => (
                    <FeedItem
                      key={feed.id}
                      feedId={feed.id}
                      title={feed.title}
                      unreadCount={getUnreadCount(feed.id)}
                      isSelected={selectedFeedId === feed.id}
                      onSelect={() => {
                        setSelectedFeed(feed.id)
                        setFilterMode('all')
                      }}
                      onRemove={() => handleRemoveFeed(feed.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Uncategorized */}
        {uncategorizedFeeds.length > 0 && (
          <div className="mb-1">
            <div
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Uncategorized
            </div>
            <div className="space-y-0.5">
              {uncategorizedFeeds.map((feed) => (
                <FeedItem
                  key={feed.id}
                  feedId={feed.id}
                  title={feed.title}
                  unreadCount={getUnreadCount(feed.id)}
                  isSelected={selectedFeedId === feed.id}
                  onSelect={() => {
                    setSelectedFeed(feed.id)
                    setFilterMode('all')
                  }}
                  onRemove={() => handleRemoveFeed(feed.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div
        className="space-y-1 border-t px-2 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={() => setShowAddFeed(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <Plus size={18} />
          Add Feed
        </button>
        <button
          onClick={() => setShowImportOPML(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <Upload size={18} />
          Import OPML
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* Dialogs */}
      <AddFeedDialog open={showAddFeed} onClose={() => setShowAddFeed(false)} />
      <ImportOPMLDialog
        open={showImportOPML}
        onClose={() => setShowImportOPML(false)}
      />
    </div>
  )
}

function FeedItem({
  feedId,
  title,
  unreadCount,
  isSelected,
  onSelect,
  onRemove,
}: {
  feedId: string
  title: string
  unreadCount: number
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  return (
    <div
      className="group flex items-center rounded-lg transition-all duration-200"
      style={{
        backgroundColor: isSelected
          ? 'var(--color-accent-light)'
          : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    >
      <button
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-sm transition-all duration-200"
        style={{
          color: isSelected
            ? 'var(--color-accent)'
            : 'var(--color-text-secondary)',
        }}
      >
        <Rss size={14} className="shrink-0" />
        <span className="flex-1 truncate text-left">{title}</span>
        {unreadCount > 0 && (
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="mr-1 hidden rounded p-1 transition-all duration-200 group-hover:block"
        style={{ color: 'var(--color-text-tertiary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-danger)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-tertiary)'
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
