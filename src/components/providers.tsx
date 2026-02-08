'use client'

import { ThemeProvider } from 'next-themes'
import { FeedRefreshProvider } from '@/components/feed-refresh-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <FeedRefreshProvider>
        {children}
      </FeedRefreshProvider>
    </ThemeProvider>
  )
}
