'use client'

import { id, type InstaQLEntity } from '@instantdb/react'
import { db } from '@/lib/instantdb'
import type { AppSchema } from '@/instant.schema'
import type { Feed, FeedItem, Folder } from '@/lib/types'

// InstantDB entity types
export type DbFeed = InstaQLEntity<AppSchema, 'feeds'>
export type DbFolder = InstaQLEntity<AppSchema, 'folders'>
export type DbFeedItem = InstaQLEntity<AppSchema, 'feedItems'>

// Hooks for querying data
export function useFeeds() {
    const { data, isLoading, error } = db.useQuery({
        feeds: {
            folder: {},
            items: {},
        },
    })
    return { feeds: data?.feeds ?? [], isLoading, error }
}

export function useFolders() {
    const { data, isLoading, error } = db.useQuery({
        folders: {
            $: { order: { order: 'asc' } },
        },
    })
    return { folders: data?.folders ?? [], isLoading, error }
}

export function useFeedItems(feedId: string | null) {
    const { data, isLoading, error } = db.useQuery(
        feedId
            ? {
                feedItems: {
                    $: { where: { 'feed.id': feedId } },
                },
            }
            : { feedItems: {} }
    )
    return { items: data?.feedItems ?? [], isLoading, error }
}

// Query helpers
export async function getExistingFeedUrls(): Promise<Set<string>> {
    const { data } = await db.queryOnce({ feeds: {} })
    return new Set((data?.feeds ?? []).map((f) => f.url))
}

// Batch transact to avoid InstantDB timeout on large operations
const BATCH_SIZE = 20

type TxChunk = Extract<Parameters<typeof db.transact>[0], unknown[]>[number]

async function batchTransact(txs: TxChunk[]) {
    if (txs.length <= BATCH_SIZE) {
        await db.transact(txs)
        return
    }
    for (let i = 0; i < txs.length; i += BATCH_SIZE) {
        await db.transact(txs.slice(i, i + BATCH_SIZE))
    }
}

// Actions for mutating data
export const feedActions = {
    async addFeed(feed: Feed & { folderId?: string | null }) {
        const feedId = id()

        // Create the feed record first
        const feedTxs: Parameters<typeof db.transact>[0] = [
            db.tx.feeds[feedId].update({
                title: feed.title,
                url: feed.url,
                link: feed.link,
                description: feed.description,
                imageUrl: feed.imageUrl ?? null,
                lastFetched: new Date().toISOString(),
                createdAt: Date.now(),
            }),
        ]
        if (feed.folderId) {
            feedTxs.push(db.tx.feeds[feedId].link({ folder: feed.folderId }))
        }
        await db.transact(feedTxs)

        // Batch-insert items
        if (feed.items && feed.items.length > 0) {
            const itemTxs = feed.items.map((item) => {
                const itemId = id()
                return db.tx.feedItems[itemId]
                    .update({
                        title: item.title,
                        link: item.link,
                        content: item.content,
                        contentSnippet: item.contentSnippet,
                        author: item.author,
                        pubDate: item.pubDate,
                        imageUrl: item.imageUrl ?? null,
                        isRead: false,
                        isStarred: false,
                        createdAt: Date.now(),
                    })
                    .link({ feed: feedId })
            })
            await batchTransact(itemTxs)
        }

        return feedId
    },

    async removeFeed(feedId: string) {
        await db.transact([db.tx.feeds[feedId].delete()])
    },

    async updateFeedItems(feedId: string, items: FeedItem[]) {
        // Get existing items for this feed
        const { data } = await db.queryOnce({
            feedItems: {
                $: { where: { 'feed.id': feedId } },
            },
        })
        const existingLinks = new Set((data?.feedItems ?? []).map((i) => i.link))

        // Only add new items
        const newItems = items.filter((item) => !existingLinks.has(item.link))

        if (newItems.length === 0) {
            // Just update lastFetched
            await db.transact([
                db.tx.feeds[feedId].update({ lastFetched: new Date().toISOString() }),
            ])
            return
        }

        const itemTxs = newItems.map((item) => {
            const itemId = id()
            return db.tx.feedItems[itemId]
                .update({
                    title: item.title,
                    link: item.link,
                    content: item.content,
                    contentSnippet: item.contentSnippet,
                    author: item.author,
                    pubDate: item.pubDate,
                    imageUrl: item.imageUrl ?? null,
                    isRead: false,
                    isStarred: false,
                    createdAt: Date.now(),
                })
                .link({ feed: feedId })
        })

        await batchTransact(itemTxs)
        await db.transact([
            db.tx.feeds[feedId].update({ lastFetched: new Date().toISOString() }),
        ])
    },

    async importFeeds(feeds: Omit<Feed, 'items'>[]) {
        // Get existing feed URLs
        const { data } = await db.queryOnce({ feeds: {} })
        const existingUrls = new Set((data?.feeds ?? []).map((f) => f.url))

        const newFeeds = feeds.filter((f) => !existingUrls.has(f.url))

        if (newFeeds.length === 0) return

        const txs = newFeeds.flatMap((feed) => {
            const feedId = id()
            const baseTx = db.tx.feeds[feedId].update({
                title: feed.title,
                url: feed.url,
                link: feed.link,
                description: feed.description,
                imageUrl: feed.imageUrl ?? null,
                lastFetched: null,
                createdAt: Date.now(),
            })
            return feed.folderId
                ? [baseTx, db.tx.feeds[feedId].link({ folder: feed.folderId })]
                : [baseTx]
        })

        await batchTransact(txs)
    },

    async markAllAsRead(feedId: string) {
        const { data } = await db.queryOnce({
            feedItems: {
                $: { where: { 'feed.id': feedId } },
            },
        })
        const unreadItems = (data?.feedItems ?? []).filter((i) => !i.isRead)
        if (unreadItems.length === 0) return

        const txs = unreadItems.map((item) =>
            db.tx.feedItems[item.id].update({ isRead: true })
        )
        await batchTransact(txs)
    },

    async renameFeed(feedId: string, newTitle: string) {
        await db.transact([db.tx.feeds[feedId].update({ title: newTitle })])
    },

    async moveFeedToFolder(feedId: string, folderId: string | null) {
        if (folderId) {
            await db.transact([db.tx.feeds[feedId].link({ folder: folderId })])
        } else {
            const { data } = await db.queryOnce({
                feeds: {
                    $: { where: { id: feedId } },
                    folder: {},
                },
            })
            const currentFolderId = data?.feeds?.[0]?.folder?.id
            if (currentFolderId) {
                await db.transact([db.tx.feeds[feedId].unlink({ folder: currentFolderId })])
            }
        }
    },

    async toggleFavorite(feedId: string, currentValue: boolean) {
        await db.transact([db.tx.feeds[feedId].update({ isFavorite: !currentValue })])
    },
}

export const folderActions = {
    async addFolder(folder: Folder) {
        const folderId = folder.id || id()
        // Get the max order to place new folder at the end
        const { data } = await db.queryOnce({ folders: {} })
        const maxOrder = Math.max(0, ...((data?.folders ?? []).map((f) => f.order ?? 0)))
        await db.transact([
            db.tx.folders[folderId].update({
                name: folder.name,
                isExpanded: folder.isExpanded,
                order: maxOrder + 1,
                createdAt: Date.now(),
            }),
        ])
        return folderId
    },

    async removeFolder(folderId: string) {
        await db.transact([db.tx.folders[folderId].delete()])
    },

    async toggleFolder(folderId: string, isExpanded: boolean) {
        await db.transact([db.tx.folders[folderId].update({ isExpanded: !isExpanded })])
    },

    async renameFolder(folderId: string, newName: string) {
        await db.transact([db.tx.folders[folderId].update({ name: newName })])
    },

    async setFolderSort(folderId: string, sortBy: string) {
        await db.transact([db.tx.folders[folderId].update({ sortBy })])
    },

    async reorderFolder(folderId: string, direction: 'up' | 'down') {
        // Get all folders sorted by order
        const { data } = await db.queryOnce({
            folders: { $: { order: { order: 'asc' } } },
        })
        const folders = data?.folders ?? []
        const currentIndex = folders.findIndex((f) => f.id === folderId)
        if (currentIndex === -1) return

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (targetIndex < 0 || targetIndex >= folders.length) return

        const current = folders[currentIndex]
        const target = folders[targetIndex]

        // Swap order values
        await db.transact([
            db.tx.folders[current.id].update({ order: target.order ?? targetIndex }),
            db.tx.folders[target.id].update({ order: current.order ?? currentIndex }),
        ])
    },
}

export const itemActions = {
    async markAsRead(itemId: string) {
        await db.transact([db.tx.feedItems[itemId].update({ isRead: true })])
    },

    async markAsUnread(itemId: string) {
        await db.transact([db.tx.feedItems[itemId].update({ isRead: false })])
    },

    async toggleStar(itemId: string, isStarred: boolean) {
        await db.transact([db.tx.feedItems[itemId].update({ isStarred: !isStarred })])
    },

    async saveSummary(itemId: string, summary: string) {
        await db.transact([db.tx.feedItems[itemId].update({ summary })])
    },
}
