'use client'

import { useUIStore } from '@/lib/ui-store'

interface AppShellProps {
  sidebar: React.ReactNode
  articleList: React.ReactNode
  articleReader: React.ReactNode
}

export function AppShell({ sidebar, articleList, articleReader }: AppShellProps) {
  const selectedArticleId = useUIStore((s) => s.selectedArticleId)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Backdrop overlay — mobile only */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 overflow-y-auto border-r transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {sidebar}
      </aside>

      {/* Article list — hidden on mobile when an article is selected */}
      <section
        className={`w-full shrink-0 overflow-y-auto border-r lg:w-[360px] ${
          selectedArticleId ? 'hidden lg:block' : 'block'
        }`}
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {articleList}
      </section>

      {/* Article reader — hidden on mobile when no article selected */}
      <main
        className={`w-full flex-1 overflow-y-auto ${
          selectedArticleId ? 'block' : 'hidden lg:block'
        }`}
        style={{
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        {articleReader}
      </main>
    </div>
  )
}
