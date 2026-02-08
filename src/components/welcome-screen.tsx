'use client'

import {
  Rss,
  Sparkles,
  FolderOpen,
  Star,
  Upload,
  Sun,
  Moon,
  Keyboard,
} from 'lucide-react'
import { useTheme } from 'next-themes'

const features = [
  {
    icon: Rss,
    title: 'Multi-Format Feeds',
    desc: 'RSS 2.0, Atom, and RDF formats — all supported out of the box.',
  },
  {
    icon: Sparkles,
    title: 'AI Summaries',
    desc: 'Get instant article summaries powered by Gemini AI.',
  },
  {
    icon: FolderOpen,
    title: 'Folder Organization',
    desc: 'Group your feeds into folders for a tidy reading experience.',
  },
  {
    icon: Star,
    title: 'Favorites',
    desc: 'Star articles to save them for later.',
  },
  {
    icon: Upload,
    title: 'OPML Import',
    desc: 'Bring your subscriptions from any other reader instantly.',
  },
  {
    icon: Keyboard,
    title: 'Keyboard Shortcuts',
    desc: 'Navigate efficiently with J/K, N/P, and more.',
  },
]

export function WelcomeScreen() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto">
      <div className="w-full max-w-xl px-6 py-12 lg:py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          {/* Logo mark */}
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)'
                : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              boxShadow: isDark
                ? '0 8px 32px rgba(99, 102, 241, 0.3)'
                : '0 8px 32px rgba(79, 70, 229, 0.25)',
            }}
          >
            <Rss size={28} color="#fff" strokeWidth={2.5} />
          </div>

          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Welcome to{' '}
            <span style={{ color: 'var(--color-accent)' }}>Readly</span>
          </h1>
          <p
            className="mx-auto mt-3 max-w-sm text-base leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            A clean, distraction-free RSS reader with AI-powered summaries.
            All your feeds in one place.
          </p>
        </div>

        {/* Quick start hint */}
        <div
          className="mb-10 rounded-xl border px-5 py-4"
          style={{
            borderColor: 'var(--color-accent)',
            backgroundColor: 'var(--color-accent-light)',
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            Getting started
          </p>
          <p
            className="mt-1 text-sm leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Click{' '}
            <span
              className="inline-flex items-center gap-1 font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Rss size={13} /> Add Feed
            </span>{' '}
            in the sidebar to subscribe to your first RSS feed, or{' '}
            <span
              className="inline-flex items-center gap-1 font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Upload size={13} /> Import OPML
            </span>{' '}
            to bring your existing subscriptions.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border p-4 transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <f.icon
                size={20}
                strokeWidth={1.75}
                style={{ color: 'var(--color-accent)' }}
              />
              <p
                className="mt-2.5 text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {f.title}
              </p>
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Theme hint */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {isDark ? (
            <Moon size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          ) : (
            <Sun size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          )}
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {isDark ? 'Dark' : 'Light'} mode active — switch anytime from the
            sidebar
          </p>
        </div>
      </div>
    </div>
  )
}
