'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontSize = 'small' | 'medium' | 'large'

// UI 状态 store
interface UIState {
    selectedFeedId: string | null
    selectedFolderId: string | null
    selectedArticleId: string | null
    filterMode: 'all' | 'unread' | 'starred'
    sortOrder: 'newest' | 'oldest'
    fontSize: FontSize
    sidebarOpen: boolean
    sidebarCollapsed: boolean

    setSelectedFeed: (feedId: string | null) => void
    setSelectedFolder: (folderId: string | null) => void
    setSelectedArticle: (articleId: string | null) => void
    setFilterMode: (mode: 'all' | 'unread' | 'starred') => void
    setSortOrder: (order: 'newest' | 'oldest') => void
    setFontSize: (size: FontSize) => void
    setSidebarOpen: (open: boolean) => void
    toggleSidebarCollapsed: () => void
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            selectedFeedId: null,
            selectedFolderId: null,
            selectedArticleId: null,
            filterMode: 'all',
            sortOrder: 'newest',
            fontSize: 'medium',
            sidebarOpen: false,
            sidebarCollapsed: false,

            setSelectedFeed: (feedId) => set({ selectedFeedId: feedId, selectedFolderId: null, selectedArticleId: null }),
            setSelectedFolder: (folderId) => set({ selectedFolderId: folderId, selectedFeedId: null, selectedArticleId: null }),
            setSelectedArticle: (articleId) => set({ selectedArticleId: articleId }),
            setFilterMode: (mode) => set({ filterMode: mode }),
            setSortOrder: (order) => set({ sortOrder: order }),
            setFontSize: (size) => set({ fontSize: size }),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        }),
        {
            name: 'readly-ui-settings',
            partialize: (state) => ({ fontSize: state.fontSize, sidebarCollapsed: state.sidebarCollapsed }),
        }
    )
)
