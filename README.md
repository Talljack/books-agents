# BookFinder AI

AI-powered book discovery platform built with Next.js 15, LangGraph, and OpenAI.

## Features

- **Intelligent Search**: Search millions of books across Google Books and Open Library APIs
- **Multi-language Support**: Search in any language (Chinese, English, etc.)
- **AI-Powered Analysis**: Get AI-generated book summaries, themes, and recommendations
- **Interest Matching**: Discover if a book matches your interests with a personalized score
- **Modern UI**: Built with shadcn/ui and Tailwind CSS for a beautiful experience

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **AI Orchestration**: LangGraph.js
- **AI Model**: OpenAI GPT-4o
- **Language**: TypeScript
- **Book APIs**: Google Books API, Open Library API

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Add your OpenAI API key to .env.local
# OPENAI_API_KEY=your_key_here
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Build

```bash
pnpm build
pnpm start
```

## Environment Variables

| Variable               | Description                                  | Required |
| ---------------------- | -------------------------------------------- | -------- |
| `OPENAI_API_KEY`       | OpenAI API key for AI analysis               | Yes      |
| `GOOGLE_BOOKS_API_KEY` | Google Books API key (increases rate limits) | No       |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── book/[id]/         # Book detail page
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── blocks/            # Page sections
│   └── book/              # Book-related components
├── lib/
│   ├── agents/            # LangGraph agent
│   ├── api/               # API clients
│   └── utils.ts           # Utilities
├── hooks/                 # React hooks
├── types/                 # TypeScript types
└── providers/             # React providers
```

## License

MIT
