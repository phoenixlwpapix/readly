'use client'

import { create } from 'zustand'

// UI 状态 store（不持久化到 InstantDB）
interface UIState {
    selectedFeedId: string | null
    selectedArticleId: string | null
    filterMode: 'all' | 'unread' | 'starred'
    sortOrder: 'newest' | 'oldest'

    setSelectedFeed: (feedId: string | null) => void
    setSelectedArticle: (articleId: string | null) => void
    setFilterMode: (mode: 'all' | 'unread' | 'starred') => void
    setSortOrder: (order: 'newest' | 'oldest') => void
}

export const useUIStore = create<UIState>()((set) => ({
    selectedFeedId: null,
    selectedArticleId: null,
    filterMode: 'all',
    sortOrder: 'newest',

    setSelectedFeed: (feedId) => set({ selectedFeedId: feedId, selectedArticleId: null }),
    setSelectedArticle: (articleId) => set({ selectedArticleId: articleId }),
    setFilterMode: (mode) => set({ filterMode: mode }),
    setSortOrder: (order) => set({ sortOrder: order }),
}))
