'use client'

interface AppShellProps {
  sidebar: React.ReactNode
  articleList: React.ReactNode
  articleReader: React.ReactNode
}

export function AppShell({ sidebar, articleList, articleReader }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className="w-64 shrink-0 overflow-y-auto border-r"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {sidebar}
      </aside>

      <section
        className="w-[360px] shrink-0 overflow-y-auto border-r"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {articleList}
      </section>

      <main
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        {articleReader}
      </main>
    </div>
  )
}
