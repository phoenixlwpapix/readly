'use client'

/**
 * @deprecated This file is kept for backward compatibility.
 * It re-exports from the new InstantDB-based stores.
 * New code should import from @/lib/ui-store and @/lib/feed-store directly.
 */

import { create } from 'zustand'
import { useUIStore } from './ui-store'
import type { Feed, FeedItem, Folder } from './types'

// Re-export UI store for backward compatibility
export { useUIStore }

// Legacy interface that combines UI state with data queries
// This is provided for backward compatibility with existing components
interface LegacyAppState {
  // Data (will be populated from InstantDB)
  feeds: Feed[]
  folders: Folder[]

  // UI State
  selectedFeedId: string | null
  selectedArticleId: string | null
  filterMode: 'all' | 'unread' | 'starred'
  sortOrder: 'newest' | 'oldest'

  // UI Actions
  setSelectedFeed: (feedId: string | null) => void
  setSelectedArticle: (articleId: string | null) => void
  setFilterMode: (mode: 'all' | 'unread' | 'starred') => void
  setSortOrder: (order: 'newest' | 'oldest') => void

  // Data Actions (now async, handled by feed-store)
  addFeed: (feed: Feed) => void
  removeFeed: (feedId: string) => void
  updateFeedItems: (feedId: string, items: FeedItem[]) => void
  addFolder: (folder: Folder) => void
  removeFolder: (folderId: string) => void
  toggleFolder: (folderId: string) => void
  markAsRead: (articleId: string) => void
  markAsUnread: (articleId: string) => void
  toggleStar: (articleId: string) => void
  importFeeds: (feeds: Feed[]) => void
}

// Create a minimal store that just bridges to the new stores
// Components using this will need to also use the InstantDB hooks for data
export const useAppStore = create<LegacyAppState>()((set, get) => ({
  // Empty data - components should use InstantDB hooks instead
  feeds: [],
  folders: [],

  // UI State - delegated to useUIStore
  selectedFeedId: null,
  selectedArticleId: null,
  filterMode: 'all',
  sortOrder: 'newest',

  // UI Actions
  setSelectedFeed: (feedId) => {
    useUIStore.getState().setSelectedFeed(feedId)
    set({ selectedFeedId: feedId, selectedArticleId: null })
  },
  setSelectedArticle: (articleId) => {
    useUIStore.getState().setSelectedArticle(articleId)
    set({ selectedArticleId: articleId })
  },
  setFilterMode: (mode) => {
    useUIStore.getState().setFilterMode(mode)
    set({ filterMode: mode })
  },
  setSortOrder: (order) => {
    useUIStore.getState().setSortOrder(order)
    set({ sortOrder: order })
  },

  // Data Actions - these are now no-ops, actual data operations use feed-store
  addFeed: () => { },
  removeFeed: () => { },
  updateFeedItems: () => { },
  addFolder: () => { },
  removeFolder: () => { },
  toggleFolder: () => { },
  markAsRead: () => { },
  markAsUnread: () => { },
  toggleStar: () => { },
  importFeeds: () => { },
}))
