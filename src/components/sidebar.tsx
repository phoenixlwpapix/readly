'use client'

import { useState, useRef, useEffect } from 'react'
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
  MoreHorizontal,
  Check,
  Pencil,
  Trash2,
  FolderInput,
  Folder,
  CornerUpLeft,
  ArrowUpDown,
  X,
} from 'lucide-react'
import { useUIStore } from '@/lib/ui-store'
import { useFeeds, useFolders, feedActions, folderActions } from '@/lib/feed-store'
import { AddFeedDialog } from '@/components/add-feed-dialog'
import { ImportOPMLDialog } from '@/components/import-opml-dialog'
import { ConfirmModal } from '@/components/confirm-modal'
import type { Folder as FolderType } from '@/lib/types'

const SORT_OPTIONS = [
  { value: 'alpha-asc', label: 'Alphabetical (A → Z)' },
  { value: 'alpha-desc', label: 'Alphabetical (Z → A)' },
  { value: 'added-newest', label: 'Date Added (Newest)' },
  { value: 'added-oldest', label: 'Date Added (Oldest)' },
] as const

function sortFolderFeeds<T extends { title: string; createdAt: number }>(
  feeds: T[],
  sortBy?: string | null,
): T[] {
  if (!sortBy) return feeds
  const sorted = [...feeds]
  switch (sortBy) {
    case 'alpha-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'alpha-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title))
    case 'added-newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'added-oldest':
      return sorted.sort((a, b) => a.createdAt - b.createdAt)
    default:
      return feeds
  }
}

export function Sidebar() {
  const { feeds, isLoading: feedsLoading } = useFeeds()
  const { folders } = useFolders()

  const selectedFeedId = useUIStore((s) => s.selectedFeedId)
  const filterMode = useUIStore((s) => s.filterMode)
  const setSelectedFeed = useUIStore((s) => s.setSelectedFeed)
  const setFilterMode = useUIStore((s) => s.setFilterMode)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

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
        <div className="flex-1" />
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 transition-colors lg:hidden"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')
          }
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-2 space-y-0.5 px-2">
        <button
          onClick={() => {
            setFilterMode('all')
            setSelectedFeed(null)
            setSidebarOpen(false)
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
          onClick={() => {
            setFilterMode('starred')
            setSidebarOpen(false)
          }}
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
          const folderFeeds = sortFolderFeeds(
            getFeedsInFolder(folder.id),
            folder.sortBy,
          )
          return (
            <FolderItem
              key={folder.id}
              folderId={folder.id}
              name={folder.name}
              isExpanded={folder.isExpanded}
              sortBy={folder.sortBy}
              feedCount={folderFeeds.length}
            >
              {folder.isExpanded && (
                <div className="ml-2 space-y-0.5">
                  {folderFeeds.map((feed) => (
                    <FeedItem
                      key={feed.id}
                      feedId={feed.id}
                      title={feed.title}
                      unreadCount={getUnreadCount(feed.id)}
                      isSelected={selectedFeedId === feed.id}
                      folders={folders}
                      onSelect={() => {
                        setSelectedFeed(feed.id)
                        setFilterMode('all')
                        setSidebarOpen(false)
                      }}
                      onRemove={() => handleRemoveFeed(feed.id)}
                    />
                  ))}
                </div>
              )}
            </FolderItem>
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
                  folders={folders}
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


function FolderItem({
  folderId,
  name,
  isExpanded,
  sortBy,
  feedCount,
  children,
}: {
  folderId: string
  name: string
  isExpanded: boolean
  sortBy?: string | null
  feedCount: number
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuView, setMenuView] = useState<'main' | 'sort'>('main')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) setMenuView('main')
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const handleToggle = async () => {
    await folderActions.toggleFolder(folderId, isExpanded)
  }

  const handleStartRename = () => {
    setMenuOpen(false)
    setRenameValue(name)
    setIsRenaming(true)
  }

  const handleRenameSubmit = async () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== name) {
      await folderActions.renameFolder(folderId, trimmed)
    }
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit()
    else if (e.key === 'Escape') setIsRenaming(false)
  }

  const handleDeleteClick = () => {
    setMenuOpen(false)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false)
    await folderActions.removeFolder(folderId)
  }

  const handleSortChange = async (value: string) => {
    setMenuOpen(false)
    await folderActions.setFolderSort(folderId, value)
  }

  return (
    <div className="mb-1">
      <div
        className="group relative flex items-center rounded-lg transition-all duration-200"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <button
          onClick={handleToggle}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded border px-1.5 py-0.5 text-xs font-semibold uppercase outline-none"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-accent)',
                color: 'var(--color-text-primary)',
              }}
            />
          ) : (
            <span className="flex-1 truncate text-left">{name}</span>
          )}
        </button>

        {/* Menu trigger */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(!menuOpen)
          }}
          className="shrink-0 rounded p-1 transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100"
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <MoreHorizontal size={14} />
        </button>

        {/* Feed count */}
        {!isRenaming && (
          <span
            className="mr-2 shrink-0 text-xs font-normal"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {feedCount}
          </span>
        )}

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-50 mt-1 min-w-52 rounded-lg border py-1 shadow-lg"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {menuView === 'main' ? (
              <>
                <DropdownItem
                  icon={<Pencil size={14} />}
                  label="Rename"
                  onClick={handleStartRename}
                />
                <DropdownItem
                  icon={<ArrowUpDown size={14} />}
                  label="Sort Feeds"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuView('sort')
                  }}
                  hasSubmenu
                />
                <div
                  className="my-1 h-px"
                  style={{ backgroundColor: 'var(--color-border)' }}
                />
                <DropdownItem
                  icon={<Trash2 size={14} />}
                  label="Delete Folder"
                  onClick={handleDeleteClick}
                  danger
                />
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuView('main')
                  }}
                  className="flex w-full items-center gap-2 border-b px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                  style={{
                    color: 'var(--color-text-tertiary)',
                    borderColor: 'var(--color-border)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                >
                  <CornerUpLeft size={12} />
                  Back
                </button>
                {SORT_OPTIONS.map((option) => (
                  <DropdownItem
                    key={option.value}
                    label={option.label}
                    checked={sortBy === option.value}
                    onClick={() => handleSortChange(option.value)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {children}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Folder"
        message={`Are you sure you want to delete "${name}"? Feeds inside will be moved to Uncategorized.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}


function FeedItem({
  feedId,
  title,
  unreadCount,
  isSelected,
  folders,
  onSelect,
  onRemove,
}: {
  feedId: string
  title: string
  unreadCount: number
  isSelected: boolean
  folders: FolderType[]
  onSelect: () => void
  onRemove: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuView, setMenuView] = useState<'main' | 'move'>('main')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset menu view when closed
  useEffect(() => {
    if (!menuOpen) {
      setMenuView('main')
    }
  }, [menuOpen])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Focus input when renaming
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const handleMarkAllRead = async () => {
    setMenuOpen(false)
    await feedActions.markAllAsRead(feedId)
  }

  const handleStartRename = () => {
    setMenuOpen(false)
    setRenameValue(title)
    setIsRenaming(true)
  }

  const handleRenameSubmit = async () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== title) {
      await feedActions.renameFeed(feedId, trimmed)
    }
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      setIsRenaming(false)
    }
  }

  const handleUnfollowClick = () => {
    setMenuOpen(false)
    setShowDeleteConfirm(true)
  }

  const handleConfirmUnfollow = () => {
    setShowDeleteConfirm(false)
    onRemove()
  }

  return (
    <div
      className="group relative flex items-center rounded-lg transition-all duration-200"
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
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded border px-1.5 py-0.5 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-text-primary)',
            }}
          />
        ) : (
          <span className="flex-1 truncate text-left">{title}</span>
        )}
      </button>

      {/* Menu trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen(!menuOpen)
        }}
        className="shrink-0 rounded p-1 transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100"
        style={{ color: 'var(--color-text-tertiary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <MoreHorizontal size={14} />
      </button>

      {/* Unread count badge */}
      {!isRenaming && unreadCount > 0 && (
        <span
          className="mr-2 shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'white',
          }}
        >
          {unreadCount}
        </span>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-lg border py-1 shadow-lg"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          {menuView === 'main' ? (
            <>
              <DropdownItem
                icon={<Check size={14} />}
                label="Mark as Read"
                onClick={handleMarkAllRead}
              />
              <DropdownItem
                icon={<Pencil size={14} />}
                label="Rename"
                onClick={handleStartRename}
              />
              <DropdownItem
                icon={<FolderInput size={14} />}
                label="Move to..."
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuView('move')
                }}
                hasSubmenu
              />
              <div
                className="my-1 h-px"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
              <DropdownItem
                icon={<Trash2 size={14} />}
                label="Unfollow"
                onClick={handleUnfollowClick}
                danger
              />
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuView('main')
                }}
                className="flex w-full items-center gap-2 border-b px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  color: 'var(--color-text-tertiary)',
                  borderColor: 'var(--color-border)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <CornerUpLeft size={12} />
                Back
              </button>
              <div className="max-h-48 overflow-y-auto">
                <DropdownItem
                  icon={<Rss size={14} />}
                  label="No Folder"
                  onClick={async () => {
                    await feedActions.moveFeedToFolder(feedId, null)
                    setMenuOpen(false)
                  }}
                />
                {folders.map((folder) => (
                  <DropdownItem
                    key={folder.id}
                    icon={<Folder size={14} />}
                    label={folder.name}
                    onClick={async () => {
                      await feedActions.moveFeedToFolder(feedId, folder.id)
                      setMenuOpen(false)
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Unfollow Feed"
        message={`Are you sure you want to unfollow "${title}"? This will remove the feed and all its articles.`}
        confirmLabel="Unfollow"
        onConfirm={handleConfirmUnfollow}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

function DropdownItem({
  icon,
  label,
  onClick,
  danger = false,
  hasSubmenu = false,
  checked = false,
}: {
  icon?: React.ReactNode
  label: string
  onClick: (e: React.MouseEvent) => void
  danger?: boolean
  hasSubmenu?: boolean
  checked?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors"
      style={{
        color: danger ? 'var(--color-danger)' : 'var(--color-text-primary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {icon ? icon : <span className="w-3.5 shrink-0" />}
      <span className="flex-1 text-left">{label}</span>
      {checked && <Check size={14} style={{ color: 'var(--color-accent)' }} />}
      {hasSubmenu && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
    </button>
  )
}
