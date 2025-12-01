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
- **AI Models**: Multi-provider support (OpenAI, Anthropic, Ollama, DeepSeek, etc.)
- **Language**: TypeScript
- **Book APIs**: Google Books API, Open Library API, Internet Archive

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# (Optional) Copy environment variables template
cp env.example .env.local

# (Optional) Install Ollama for local LLM
# Download from: https://ollama.ai
# Then run: ollama pull llama3.2

# No API keys required! The app uses Ollama by default.
# You can configure other providers in the Settings page.
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

## LLM Provider Configuration

### Default: Ollama (Local, No API Key Required) ⭐

The app uses **Ollama** by default, which runs locally on your machine. No API keys or internet connection required!

1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3.2`
3. Start the app: `pnpm dev`

### Alternative: Configure via UI Settings

You can switch to any supported provider through the **Settings** page in the app:

- **OpenAI** (GPT-4o, GPT-4, GPT-3.5)
- **Anthropic** (Claude 3.5, Claude 3)
- **DeepSeek** (deepseek-chat, deepseek-coder)
- **OpenRouter** (Access 200+ models)
- **Google Gemini**
- **Groq** (Ultra-fast inference)
- **Together AI**, **Mistral**, **Cohere**
- **Chinese Providers**: Moonshot (Kimi), 智谱 AI, 百川, 零一万物, MiniMax, 硅基流动
- **Custom** OpenAI-compatible endpoints

### Optional: Environment Variables

If you prefer to configure via environment variables (useful for deployment):

```bash
# Example: Use OpenAI
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4o-mini

# Example: Use DeepSeek
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_MODEL=deepseek-chat

# Example: Use OpenRouter
OPENROUTER_API_KEY=sk-or-your-api-key
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

**Note**: Environment variables are optional. The app works out of the box with Ollama.

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
