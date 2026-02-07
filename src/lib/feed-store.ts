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
            $: { order: { createdAt: 'asc' } },
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

// Actions for mutating data
export const feedActions = {
    async addFeed(feed: Feed & { folderId?: string | null }) {
        // Always generate a new UUID - InstantDB requires UUID format
        const feedId = id()

        // Build transactions for the feed itself
        const txs: Parameters<typeof db.transact>[0] = [
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

        // Link to folder if specified
        if (feed.folderId) {
            txs.push(db.tx.feeds[feedId].link({ folder: feed.folderId }))
        }

        // Add all items
        if (feed.items && feed.items.length > 0) {
            for (const item of feed.items) {
                const itemId = id()
                txs.push(
                    db.tx.feedItems[itemId]
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
                )
            }
        }

        await db.transact(txs)
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

        const txs = newItems.map((item) => {
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

        await db.transact([
            ...txs,
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

        await db.transact(txs)
    },
}

export const folderActions = {
    async addFolder(folder: Folder) {
        const folderId = folder.id || id()
        await db.transact([
            db.tx.folders[folderId].update({
                name: folder.name,
                isExpanded: folder.isExpanded,
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
