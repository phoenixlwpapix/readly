# Readly

A modern, intelligent RSS reader built with Next.js and InstantDB.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![InstantDB](https://img.shields.io/badge/InstantDB-Realtime-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)

## Features

- **RSS Feed Management** - Add, organize, and manage RSS feeds with support for RSS 2.0, Atom, and RDF/RSS 1.0
- **Folder Organization** - Group feeds into folders with custom sorting options
- **Starred Articles** - Save articles for later reading
- **Real-time Sync** - Data synced via InstantDB cloud database
- **Dark / Light Mode** - Theme toggle with CSS custom properties
- **OPML Import** - Import feeds from other RSS readers
- **AI Summarization** - AI-powered article summaries using Google Gemini 2.0 Flash
- **Mobile Responsive** - Slide-over sidebar drawer, single-panel navigation on mobile (<1024px), fully usable on phones and tablets

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript + React 19
- **Database**: [InstantDB](https://instantdb.com) - Real-time cloud database
- **Styling**: Tailwind CSS v4
- **AI**: Google Gemini 2.0 Flash via AI SDK v6 (`@ai-sdk/google`)
- **RSS Parsing**: Custom parser with `fast-xml-parser`
- **State**: Zustand (UI state, persisted font size preference)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/phoenixlwpapix/readly.git
cd readly
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file:

```env
# Google AI API Key (for AI summarization)
# Get your key at: https://aistudio.google.com/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

# InstantDB App ID
NEXT_PUBLIC_INSTANTDB_APP_ID=your_instantdb_app_id_here
```

4. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── summarize/     # AI summarization endpoint
│   ├── actions.ts         # Server actions (fetch feed, parse OPML)
│   ├── globals.css        # Theme variables & article typography
│   └── page.tsx           # Main page
├── components/            # React components (all Client Components)
│   ├── app-shell.tsx      # 3-panel responsive layout
│   ├── sidebar.tsx        # Feed tree, folders, nav filters, theme toggle
│   ├── article-list.tsx   # Filtered/sorted article cards
│   ├── article-reader.tsx # Article content with AI summarize
│   ├── add-feed-dialog.tsx
│   ├── import-opml-dialog.tsx
│   ├── confirm-modal.tsx
│   └── providers.tsx      # ThemeProvider wrapper
├── hooks/
│   └── use-ai-summary.ts  # Streaming AI summary hook
├── lib/
│   ├── instantdb.ts       # InstantDB client init
│   ├── feed-store.ts      # Data hooks & mutation actions
│   ├── ui-store.ts        # UI state (selection, filters, sidebar)
│   ├── rss.ts             # RSS/Atom/RDF parser
│   ├── opml.ts            # OPML parser
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Utilities (cn, formatRelativeDate)
└── instant.schema.ts      # InstantDB schema definition
```

## Scripts

```bash
pnpm dev          # Start development server (Turbopack)
pnpm build        # Production build + type checking
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## License

MIT
