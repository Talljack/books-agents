// Book types for the application

export interface Book {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  thumbnail?: string;
  previewLink?: string;
  infoLink?: string;
  averageRating?: number;
  ratingsCount?: number;
  isbn?: string;
  source: "google" | "openlibrary";
}

export interface SearchResult {
  books: Book[];
  totalItems: number;
  query: string;
}

export interface BookAnalysis {
  summary: string;
  themes: string[];
  targetAudience: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  keyTakeaways: string[];
  shouldRead: {
    score: number; // 0-100
    reasons: string[];
  };
  similarBooks?: string[];
}

export interface SearchFilters {
  language?: string;
  category?: string;
  orderBy?: "relevance" | "newest";
}

export interface AgentState {
  query: string;
  filters?: SearchFilters;
  books: Book[];
  selectedBook?: Book;
  analysis?: BookAnalysis;
  messages: AgentMessage[];
  error?: string;
}

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}
