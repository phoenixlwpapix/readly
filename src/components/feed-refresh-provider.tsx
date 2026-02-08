'use client'

import { createContext, useContext } from 'react'
import { useFeedRefresh } from '@/hooks/use-feed-refresh'

interface FeedRefreshContextValue {
    isRefreshing: boolean
    lastRefreshTime: number | null
    refresh: () => void
}

const FeedRefreshContext = createContext<FeedRefreshContextValue | null>(null)

export function FeedRefreshProvider({ children }: { children: React.ReactNode }) {
    const value = useFeedRefresh()
    return (
        <FeedRefreshContext.Provider value={value}>
            {children}
        </FeedRefreshContext.Provider>
    )
}

export function useFeedRefreshContext() {
    const context = useContext(FeedRefreshContext)
    if (!context) {
        throw new Error('useFeedRefreshContext must be used within FeedRefreshProvider')
    }
    return context
}
