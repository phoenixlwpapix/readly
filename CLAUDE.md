# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build — also runs TypeScript type checking
pnpm lint         # ESLint
```

No test framework is configured yet.

## Architecture

Readly is a Feedly-style RSS reader — a single-page Next.js 16 app with a 3-panel layout (sidebar / article list / article reader). All data is client-side only, persisted to localStorage via Zustand.

### Data Flow

- **Server Actions** (`src/app/actions.ts`) — `fetchFeed(url)` and `parseOPMLAction(fileContent)` run server-side to fetch RSS feeds and parse OPML files
- **RSS parsing** (`src/lib/rss.ts`) — Custom parser using `fast-xml-parser` that handles RSS 2.0, Atom, and RDF/RSS 1.0 formats. The `rss-parser` package is installed but not used.
- **OPML parsing** (`src/lib/opml.ts`) — Parses OPML XML into flat feed list with folder assignments
- **State** (`src/lib/store.ts`) — Zustand store with `persist` middleware. Stores feeds (with nested items), folders, selection state, filter/sort preferences. Key: `readly-storage` in localStorage
- **AI summarization** — `POST /api/summarize` route streams Gemini 2.0 Flash responses via AI SDK. Client uses `useCompletion` hook from `@ai-sdk/react` (`src/hooks/use-ai-summary.ts`)

### UI Structure

All UI components are Client Components (`'use client'`). The main page (`src/app/page.tsx`) composes:

- `AppShell` — 3-column flex layout (sidebar 256px / article list 360px / reader flex-1)
- `Sidebar` — Feed tree with folders, nav filters (All/Starred), feed management (Add Feed / Import OPML dialogs), theme toggle
- `ArticleList` — Filtered/sorted article cards with unread dots, star toggles
- `ArticleReader` — Article content renderer with AI summarize button, toolbar actions

### Theming

Dark/light mode via `next-themes` with class strategy. All colors use CSS custom properties (`var(--color-*)`) defined in `globals.css` with `:root` and `.dark` variants. Tailwind v4 dark mode configured with `@custom-variant dark (&:where(.dark, .dark *))`.

## Key Conventions

- AI SDK v6: use `toTextStreamResponse()` — `toDataStreamResponse()` does not exist in this version
- `@/*` path alias maps to `./src/*`
- Environment: `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local` (auto-read by `@ai-sdk/google`)
