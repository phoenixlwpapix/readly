'use client'

import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import type { Feed, FeedItem, Folder } from '@/lib/types'

export interface StoredFeed {
  id: string
  title: string
  url: string
  link: string
  description: string
  imageUrl?: string | null
  folderId?: string | null
  isFavorite?: boolean
  lastFetched?: string | null
  createdAt: number
}

export interface StoredFolder {
  id: string
  name: string
  isExpanded: boolean
  sortBy?: string
  order: number
  createdAt: number
}

export interface FeedWithDetails extends StoredFeed {
  folder: StoredFolder | null
  items: FeedItem[]
}

export type DbFeed = FeedWithDetails
export type DbFolder = StoredFolder
export type DbFeedItem = FeedItem

interface PersistedData {
  feeds: StoredFeed[]
  folders: StoredFolder[]
  readLinks: string[] // Capped at 5000 URLs
  starredItems: FeedItem[] // Explicitly starred articles only
}

interface FeedStoreState extends PersistedData {
  transientItems: Record<string, FeedItem[]> // In-memory only (latest articles stream)
  hasHydrated: boolean

  setHasHydrated: (val: boolean) => void
  addFeed: (feed: Feed & { folderId?: string | null }) => string
  removeFeed: (feedId: string) => void
  updateFeedItems: (feedId: string, items: FeedItem[]) => void
  importFeeds: (feeds: Omit<Feed, 'items'>[]) => void
  markAllAsRead: (feedId: string) => void
  renameFeed: (feedId: string, newTitle: string) => void
  moveFeedToFolder: (feedId: string, folderId: string | null) => void
  toggleFavorite: (feedId: string, currentValue: boolean) => void
  addFolder: (folder: Folder) => string
  removeFolder: (folderId: string) => void
  toggleFolder: (folderId: string, isExpanded: boolean) => void
  renameFolder: (folderId: string, newName: string) => void
  setFolderSort: (folderId: string, sortBy: string) => void
  reorderFolder: (folderId: string, direction: 'up' | 'down') => void
  markAsRead: (itemId: string) => void
  markAsUnread: (itemId: string) => void
  toggleStar: (itemId: string, isStarred: boolean) => void
  batchImport: (feeds: StoredFeed[], folders: StoredFolder[]) => void
}

export const useFeedStore = create<FeedStoreState>()(
  persist(
    (set) => ({
      feeds: [],
      folders: [],
      readLinks: [],
      starredItems: [],
      transientItems: {},
      hasHydrated: false,

      setHasHydrated: (val) => set({ hasHydrated: val }),

      addFeed: (feed) => {
        const feedId = feed.id || generateId()
        const newFeed: StoredFeed = {
          id: feedId,
          title: feed.title,
          url: feed.url,
          link: feed.link,
          description: feed.description,
          imageUrl: feed.imageUrl ?? null,
          folderId: feed.folderId ?? null,
          lastFetched: new Date().toISOString(),
          createdAt: Date.now(),
        }
        const items = (feed.items ?? []).slice(0, 25).map((i) => ({ ...i, feedId }))
        set((state) => ({
          feeds: [...state.feeds.filter((f) => f.url !== feed.url), newFeed],
          transientItems: {
            ...state.transientItems,
            [feedId]: items,
          },
        }))
        return feedId
      },

      removeFeed: (feedId) =>
        set((state) => {
          const nextTransient = { ...state.transientItems }
          delete nextTransient[feedId]
          return {
            feeds: state.feeds.filter((f) => f.id !== feedId),
            starredItems: state.starredItems.filter((i) => i.feedId !== feedId),
            transientItems: nextTransient,
          }
        }),

      updateFeedItems: (feedId, items) =>
        set((state) => {
          // Keep only the latest 25 articles in memory per feed
          const latestItems = items.slice(0, 25).map((i) => ({
            ...i,
            feedId,
          }))
          const updatedFeeds = state.feeds.map((f) =>
            f.id === feedId ? { ...f, lastFetched: new Date().toISOString() } : f
          )
          return {
            feeds: updatedFeeds,
            transientItems: {
              ...state.transientItems,
              [feedId]: latestItems,
            },
          }
        }),

      importFeeds: (feedsToImport) =>
        set((state) => {
          const existingUrls = new Set(state.feeds.map((f) => f.url))
          const toAdd: StoredFeed[] = []
          for (const f of feedsToImport) {
            if (!existingUrls.has(f.url)) {
              existingUrls.add(f.url)
              toAdd.push({
                id: f.id || generateId(),
                title: f.title,
                url: f.url,
                link: f.link,
                description: f.description,
                imageUrl: f.imageUrl ?? null,
                folderId: f.folderId ?? null,
                lastFetched: null,
                createdAt: Date.now(),
              })
            }
          }
          return { feeds: [...state.feeds, ...toAdd] }
        }),

      markAllAsRead: (feedId) =>
        set((state) => {
          const items = state.transientItems[feedId] ?? []
          const newLinks = items.map((i) => i.link).filter(Boolean)
          const setLinks = new Set([...state.readLinks, ...newLinks])
          const arr = Array.from(setLinks)
          if (arr.length > 5000) arr.splice(0, arr.length - 5000)
          return { readLinks: arr }
        }),

      renameFeed: (feedId, newTitle) =>
        set((state) => ({
          feeds: state.feeds.map((f) => (f.id === feedId ? { ...f, title: newTitle } : f)),
        })),

      moveFeedToFolder: (feedId, folderId) =>
        set((state) => ({
          feeds: state.feeds.map((f) => (f.id === feedId ? { ...f, folderId } : f)),
        })),

      toggleFavorite: (feedId, currentValue) =>
        set((state) => ({
          feeds: state.feeds.map((f) =>
            f.id === feedId ? { ...f, isFavorite: !currentValue } : f
          ),
        })),

      addFolder: (folder) => {
        const folderId = folder.id || generateId()
        set((state) => {
          const maxOrder = Math.max(0, ...state.folders.map((f) => f.order ?? 0))
          const newFolder: StoredFolder = {
            id: folderId,
            name: folder.name,
            isExpanded: folder.isExpanded,
            sortBy: folder.sortBy,
            order: maxOrder + 1,
            createdAt: Date.now(),
          }
          return { folders: [...state.folders, newFolder] }
        })
        return folderId
      },

      removeFolder: (folderId) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== folderId),
          feeds: state.feeds.map((f) =>
            f.folderId === folderId ? { ...f, folderId: null } : f
          ),
        })),

      toggleFolder: (folderId, isExpanded) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId ? { ...f, isExpanded: !isExpanded } : f
          ),
        })),

      renameFolder: (folderId, newName) =>
        set((state) => ({
          folders: state.folders.map((f) => (f.id === folderId ? { ...f, name: newName } : f)),
        })),

      setFolderSort: (folderId, sortBy) =>
        set((state) => ({
          folders: state.folders.map((f) => (f.id === folderId ? { ...f, sortBy } : f)),
        })),

      reorderFolder: (folderId, direction) =>
        set((state) => {
          const sorted = [...state.folders].sort((a, b) => a.order - b.order)
          const index = sorted.findIndex((f) => f.id === folderId)
          if (index === -1) return state
          const targetIndex = direction === 'up' ? index - 1 : index + 1
          if (targetIndex < 0 || targetIndex >= sorted.length) return state
          const current = sorted[index]
          const target = sorted[targetIndex]
          const tempOrder = current.order
          current.order = target.order
          target.order = tempOrder
          return { folders: [...sorted] }
        }),

      markAsRead: (itemId) =>
        set((state) => {
          let link: string | undefined
          for (const items of Object.values(state.transientItems)) {
            const found = items.find((i) => i.id === itemId)
            if (found) {
              link = found.link
              break
            }
          }
          if (!link) {
            const found = state.starredItems.find((i) => i.id === itemId)
            if (found) link = found.link
          }
          if (!link || state.readLinks.includes(link)) return state

          const newReadLinks = [...state.readLinks, link]
          if (newReadLinks.length > 5000) {
            newReadLinks.splice(0, newReadLinks.length - 5000)
          }
          return { readLinks: newReadLinks }
        }),

      markAsUnread: (itemId) =>
        set((state) => {
          let link: string | undefined
          for (const items of Object.values(state.transientItems)) {
            const found = items.find((i) => i.id === itemId)
            if (found) {
              link = found.link
              break
            }
          }
          if (!link) {
            const found = state.starredItems.find((i) => i.id === itemId)
            if (found) link = found.link
          }
          if (!link) return state
          return { readLinks: state.readLinks.filter((l) => l !== link) }
        }),

      toggleStar: (itemId, isStarred) =>
        set((state) => {
          if (isStarred) {
            return { starredItems: state.starredItems.filter((i) => i.id !== itemId) }
          }
          let itemToStar: FeedItem | undefined
          for (const [fId, items] of Object.entries(state.transientItems)) {
            const found = items.find((i) => i.id === itemId)
            if (found) {
              itemToStar = { ...found, feedId: fId, isStarred: true }
              break
            }
          }
          if (!itemToStar) return state
          return {
            starredItems: [
              ...state.starredItems.filter(
                (i) => i.id !== itemId && i.link !== itemToStar!.link
              ),
              itemToStar,
            ],
          }
        }),

      batchImport: (newFeeds, newFolders) =>
        set((state) => ({
          feeds: [...state.feeds, ...newFeeds],
          folders: [...state.folders, ...newFolders],
        })),
    }),
    {
      name: 'readly-feeds-storage',
      version: 1,
      // Remove legacy AI data while keeping subscriptions, history, and favorites.
      migrate: (persistedState) => {
        const data = persistedState as Partial<PersistedData>
        return {
          feeds: data.feeds ?? [],
          folders: data.folders ?? [],
          readLinks: data.readLinks ?? [],
          starredItems: (data.starredItems ?? []).map((item) => {
            const cleaned = { ...item } as FeedItem & { summary?: string }
            delete cleaned.summary
            return cleaned
          }),
        }
      },
      // Persist only metadata, read history, and starred items. Transient articles stay in memory!
      partialize: (state) => ({
        feeds: state.feeds,
        folders: state.folders,
        readLinks: state.readLinks,
        starredItems: state.starredItems,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

// Background check for one-time InstantDB data migration if localStorage is empty
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      const store = useFeedStore.getState()
      if (store.feeds.length > 0) return
      const { db } = await import('@/lib/instantdb')
      const { data } = await Promise.race([
        db.queryOnce({ feeds: { folder: {} }, folders: {} }),
        new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 2500)),
      ])
      if (data?.feeds && data.feeds.length > 0) {
        const migratedFolders: StoredFolder[] = (data.folders ?? []).map((f) => ({
          id: f.id,
          name: f.name,
          isExpanded: f.isExpanded ?? true,
          sortBy: f.sortBy ?? undefined,
          order: f.order ?? 0,
          createdAt: f.createdAt ?? Date.now(),
        }))
        const migratedFeeds: StoredFeed[] = data.feeds.map((f) => ({
          id: f.id,
          title: f.title,
          url: f.url,
          link: f.link ?? '',
          description: f.description ?? '',
          imageUrl: f.imageUrl ?? null,
          folderId: f.folder?.id ?? null,
          isFavorite: f.isFavorite ?? false,
          lastFetched: f.lastFetched ?? null,
          createdAt: f.createdAt ?? Date.now(),
        }))
        store.batchImport(migratedFeeds, migratedFolders)
      }
    } catch {
      // InstantDB not reachable or already empty, skip silently
    }
  }, 200)
}

// React hooks mimicking original API for 100% backward compatibility
export function useFeeds() {
  const feeds = useFeedStore((s) => s.feeds)
  const folders = useFeedStore((s) => s.folders)
  const transientItems = useFeedStore((s) => s.transientItems)
  const readLinks = useFeedStore((s) => s.readLinks)
  const starredItems = useFeedStore((s) => s.starredItems)
  const hasHydrated = useFeedStore((s) => s.hasHydrated)

  const composedFeeds: FeedWithDetails[] = useMemo(() => {
    const folderMap = new Map(folders.map((f) => [f.id, f]))
    const readSet = new Set(readLinks)
    const starredLinkSet = new Set(starredItems.map((s) => s.link))

    return feeds.map((feed) => {
      const raw = transientItems[feed.id] ?? []
      const rawLinks = new Set(raw.map((r) => r.link))
      // Include any starred items belonging to this feed that are not in transient stream
      const extraStarred = starredItems.filter(
        (s) => s.feedId === feed.id && !rawLinks.has(s.link)
      )
      const allItems = [...raw, ...extraStarred]

      const items: FeedItem[] = allItems.map((item) => ({
        ...item,
        feedId: feed.id,
        isRead: readSet.has(item.link),
        isStarred: starredLinkSet.has(item.link),
      }))

      return {
        ...feed,
        folder: feed.folderId ? folderMap.get(feed.folderId) ?? null : null,
        items,
      }
    })
  }, [feeds, folders, transientItems, readLinks, starredItems])

  return { feeds: composedFeeds, isLoading: !hasHydrated, error: null }
}

export function useFolders() {
  const folders = useFeedStore((s) => s.folders)
  const hasHydrated = useFeedStore((s) => s.hasHydrated)

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [folders])

  return { folders: sortedFolders, isLoading: !hasHydrated, error: null }
}

export function useFeedItems(feedId: string | null) {
  const { feeds, isLoading } = useFeeds()
  const items = useMemo(() => {
    if (!feedId) {
      return feeds.flatMap((f) => f.items)
    }
    const feed = feeds.find((f) => f.id === feedId)
    return feed?.items ?? []
  }, [feeds, feedId])

  return { items, isLoading, error: null }
}

export async function getExistingFeedUrls(): Promise<Set<string>> {
  const feeds = useFeedStore.getState().feeds
  return new Set(feeds.map((f) => f.url))
}

export const feedActions = {
  async addFeed(feed: Feed & { folderId?: string | null }) {
    return useFeedStore.getState().addFeed(feed)
  },
  async removeFeed(feedId: string) {
    useFeedStore.getState().removeFeed(feedId)
  },
  async updateFeedItems(feedId: string, items: FeedItem[]) {
    useFeedStore.getState().updateFeedItems(feedId, items)
  },
  async importFeeds(feeds: Omit<Feed, 'items'>[]) {
    useFeedStore.getState().importFeeds(feeds)
  },
  async markAllAsRead(feedId: string) {
    useFeedStore.getState().markAllAsRead(feedId)
  },
  async renameFeed(feedId: string, newTitle: string) {
    useFeedStore.getState().renameFeed(feedId, newTitle)
  },
  async moveFeedToFolder(feedId: string, folderId: string | null) {
    useFeedStore.getState().moveFeedToFolder(feedId, folderId)
  },
  async toggleFavorite(feedId: string, currentValue: boolean) {
    useFeedStore.getState().toggleFavorite(feedId, currentValue)
  },
}

export const folderActions = {
  async addFolder(folder: Folder) {
    return useFeedStore.getState().addFolder(folder)
  },
  async removeFolder(folderId: string) {
    useFeedStore.getState().removeFolder(folderId)
  },
  async toggleFolder(folderId: string, isExpanded: boolean) {
    useFeedStore.getState().toggleFolder(folderId, isExpanded)
  },
  async renameFolder(folderId: string, newName: string) {
    useFeedStore.getState().renameFolder(folderId, newName)
  },
  async setFolderSort(folderId: string, sortBy: string) {
    useFeedStore.getState().setFolderSort(folderId, sortBy)
  },
  async reorderFolder(folderId: string, direction: 'up' | 'down') {
    useFeedStore.getState().reorderFolder(folderId, direction)
  },
}

export const itemActions = {
  async markAsRead(itemId: string) {
    useFeedStore.getState().markAsRead(itemId)
  },
  async markAsUnread(itemId: string) {
    useFeedStore.getState().markAsUnread(itemId)
  },
  async toggleStar(itemId: string, isStarred: boolean) {
    useFeedStore.getState().toggleStar(itemId, isStarred)
  },
}
