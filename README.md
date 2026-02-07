# Readly

A modern, intelligent RSS reader built with Next.js and InstantDB.

![Readly](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![InstantDB](https://img.shields.io/badge/InstantDB-Realtime-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

## Features

- 📰 **RSS Feed Management** - Add, organize, and manage your RSS feeds
- 📁 **Folder Organization** - Group feeds into folders for better organization
- ⭐ **Starred Articles** - Save articles for later reading
- 🔄 **Real-time Sync** - Data synced via InstantDB cloud database
- 🌙 **Dark Mode** - Beautiful light and dark themes
- 📥 **OPML Import** - Import feeds from other RSS readers
- 🤖 **AI Summarization** - Get AI-powered summaries using Google Gemini

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: [InstantDB](https://instantdb.com) - Real-time cloud database
- **Styling**: Tailwind CSS v4
- **Font**: Lato (Google Fonts)
- **AI**: Google Gemini (via Vercel AI SDK)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
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
│   ├── actions.ts         # Server actions
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── sidebar.tsx        # Feed navigation
│   ├── article-list.tsx   # Article list
│   ├── article-reader.tsx # Article viewer
│   └── ...
├── lib/                   # Utilities and stores
│   ├── instantdb.ts       # InstantDB client
│   ├── feed-store.ts      # Data hooks & actions
│   ├── ui-store.ts        # UI state management
│   └── types.ts           # TypeScript types
├── hooks/                 # Custom React hooks
└── instant.schema.ts      # InstantDB schema
```

## InstantDB Configuration

The app uses InstantDB for real-time data storage. The schema includes:

- **feeds** - RSS feed sources
- **folders** - Feed organization
- **feedItems** - Individual articles

Schema and permissions are defined in:
- `src/instant.schema.ts` - Data schema
- `instant.perms.ts` - Access permissions (public read/write)

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## License

MIT
