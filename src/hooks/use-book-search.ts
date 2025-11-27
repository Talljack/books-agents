"use client";

import { useState, useCallback } from "react";
import { Book, SearchFilters } from "@/types/book";

interface UseBookSearchResult {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  clear: () => void;
}

export function useBookSearch(): UseBookSearchResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), filters }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setBooks(data.books || []);

      // Store results in session storage for detail page
      sessionStorage.setItem("searchResults", JSON.stringify(data.books || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setBooks([]);
    setError(null);
    sessionStorage.removeItem("searchResults");
  }, []);

  return { books, isLoading, error, search, clear };
}
