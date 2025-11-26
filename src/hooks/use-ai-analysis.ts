"use client";

import { useState, useCallback } from "react";
import { Book, BookAnalysis } from "@/types/book";

interface UseAIAnalysisResult {
  analysis: BookAnalysis | null;
  isLoading: boolean;
  error: string | null;
  analyze: (book: Book) => Promise<void>;
  clear: () => void;
}

export function useAIAnalysis(): UseAIAnalysisResult {
  const [analysis, setAnalysis] = useState<BookAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (book: Book) => {
    if (!book) {
      setError("No book provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return { analysis, isLoading, error, analyze, clear };
}
