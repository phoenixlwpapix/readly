'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { refreshFeed } from '@/app/actions'
import { useFeeds, feedActions, type DbFeed } from '@/lib/feed-store'

const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes
const STALE_THRESHOLD = 5 * 60 * 1000 // 5 minutes - consider feed stale if not fetched in last 5 mins

export function useFeedRefresh() {
    const { feeds, isLoading } = useFeeds()
    const isRefreshingRef = useRef(false)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const refreshAllFeeds = useCallback(async (feedsToRefresh: DbFeed[]) => {
        if (isRefreshingRef.current || feedsToRefresh.length === 0) return

        isRefreshingRef.current = true
        setIsRefreshing(true)

        try {
            // Refresh feeds sequentially with delay to avoid 429 rate limits
            for (const feed of feedsToRefresh) {
                try {
                    const freshFeed = await refreshFeed(feed.url)
                    if (freshFeed.items && freshFeed.items.length > 0) {
                        await feedActions.updateFeedItems(feed.id, freshFeed.items)
                    }
                } catch (error) {
                    console.error(`Failed to refresh feed "${feed.title}":`, error)
                }
                // Brief pause between requests
                await new Promise((r) => setTimeout(r, 500))
            }

            setLastRefreshTime(Date.now())
        } finally {
            isRefreshingRef.current = false
            setIsRefreshing(false)
        }
    }, [])

    // Initial refresh on mount - refresh stale feeds
    useEffect(() => {
        if (isLoading || feeds.length === 0) return

        const now = Date.now()
        const staleFeeds = feeds.filter((feed) => {
            if (!feed.lastFetched) return true
            const lastFetchedTime = new Date(feed.lastFetched).getTime()
            return now - lastFetchedTime > STALE_THRESHOLD
        })

        if (staleFeeds.length > 0) {
            refreshAllFeeds(staleFeeds)
        }
    }, [isLoading, feeds.length]) // Only run when loading completes or feed count changes

    // Set up periodic refresh
    useEffect(() => {
        if (isLoading) return

        intervalRef.current = setInterval(() => {
            if (feeds.length > 0) {
                refreshAllFeeds(feeds)
            }
        }, REFRESH_INTERVAL)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isLoading, refreshAllFeeds])

    // Manual refresh function
    const refresh = useCallback(() => {
        if (feeds.length > 0) {
            refreshAllFeeds(feeds)
        }
    }, [feeds, refreshAllFeeds])

    return {
        isRefreshing,
        lastRefreshTime,
        refresh,
    }
}
