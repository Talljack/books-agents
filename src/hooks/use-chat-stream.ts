"use client";

import { useState, useCallback, useRef } from "react";
import { Book } from "@/types/book";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// 推断的偏好类型
export interface InferredPreferences {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  levelLabel: string;
  language: "en" | "zh" | "any";
  languageLabel: string;
  confidence: number;
  isFiction?: boolean;
}

interface ChatState {
  preferences: Record<string, string>;
  missingFields: string[];
  phase: "analyzing" | "confirming" | "searching" | "complete";
  inferredPreferences?: InferredPreferences;
}

interface UseChatStreamOptions {
  onMessage?: (content: string) => void;
  onBooks?: (books: Book[]) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

interface AnalyzeResult {
  inferredPreferences: InferredPreferences;
  understandingText: string;
  suggestedQuery: string;
}

interface SearchResult {
  message: string;
  books: Book[];
  searchQuery: string;
  preferences: InferredPreferences;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [chatState, setChatState] = useState<ChatState | null>(null);
  const [inferredPreferences, setInferredPreferences] = useState<InferredPreferences | null>(null);
  const [understandingText, setUnderstandingText] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<string>("");

  /**
   * 第一阶段：分析用户意图
   * 只分析，不搜索
   */
  const analyzeIntent = useCallback(
    async (message: string): Promise<AnalyzeResult | null> => {
      setIsLoading(true);
      setIsAnalyzing(true);
      lastMessageRef.current = message;

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/analyze-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.inferredPreferences) {
          setInferredPreferences(data.inferredPreferences);
          setUnderstandingText(data.understandingText || "");
          setChatState({
            preferences: {},
            missingFields: [],
            phase: "confirming",
            inferredPreferences: data.inferredPreferences,
          });
        }

        return {
          inferredPreferences: data.inferredPreferences,
          understandingText: data.understandingText,
          suggestedQuery: data.suggestedQuery,
        };
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return null;
        }
        const errorMessage = error instanceof Error ? error.message : "分析失败";
        options.onError?.(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
        setIsAnalyzing(false);
      }
    },
    [options]
  );

  /**
   * 第二阶段：确认搜索
   * 使用用户确认/调整后的偏好执行搜索
   */
  const confirmSearch = useCallback(
    async (preferences: InferredPreferences): Promise<SearchResult | null> => {
      setIsLoading(true);
      setIsSearching(true);
      setChatState((prev) => (prev ? { ...prev, phase: "searching" } : null));

      try {
        const response = await fetch("/api/confirm-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: lastMessageRef.current,
            preferences,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.books?.length > 0) {
          options.onBooks?.(data.books);
        }

        setInferredPreferences(data.preferences);
        setChatState((prev) => (prev ? { ...prev, phase: "complete" } : null));

        options.onComplete?.();

        return {
          message: data.message,
          books: data.books || [],
          searchQuery: data.searchQuery,
          preferences: data.preferences,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "搜索失败";
        options.onError?.(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    },
    [options]
  );

  /**
   * 调整偏好（不立即搜索）
   */
  const adjustPreferences = useCallback((adjusted: Partial<InferredPreferences>) => {
    setInferredPreferences((prev) => {
      if (!prev) return null;
      return { ...prev, ...adjusted };
    });
  }, []);

  /**
   * 旧版兼容：发送消息并立即搜索
   */
  const sendMessage = useCallback(
    async (
      message: string,
      history: ChatMessage[],
      adjustedPreferences?: Partial<InferredPreferences>
    ): Promise<{
      message: string;
      books?: Book[];
      inferredPreferences?: InferredPreferences;
    } | null> => {
      setIsLoading(true);
      lastMessageRef.current = message;

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history,
            mode: "agent",
            state: chatState,
            adjustedPreferences,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.state) {
          setChatState(data.state);
        }

        if (data.inferredPreferences) {
          setInferredPreferences(data.inferredPreferences);
        }

        if (data.books?.length > 0) {
          options.onBooks?.(data.books);
        }

        options.onComplete?.();
        return {
          message: data.message,
          books: data.books,
          inferredPreferences: data.inferredPreferences,
        };
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return null;
        }
        const errorMessage = error instanceof Error ? error.message : "发送失败";
        options.onError?.(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [chatState, options]
  );

  // 使用调整后的偏好重新搜索（旧版兼容）
  const researchWithPreferences = useCallback(
    async (
      adjustedPreferences: Partial<InferredPreferences>
    ): Promise<{
      message: string;
      books?: Book[];
      inferredPreferences?: InferredPreferences;
    } | null> => {
      if (!lastMessageRef.current) return null;

      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: lastMessageRef.current,
            history: [],
            mode: "agent",
            adjustedPreferences: {
              ...inferredPreferences,
              ...adjustedPreferences,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.state) {
          setChatState(data.state);
        }

        if (data.inferredPreferences) {
          setInferredPreferences(data.inferredPreferences);
        }

        if (data.books?.length > 0) {
          options.onBooks?.(data.books);
        }

        return {
          message: data.message,
          books: data.books,
          inferredPreferences: data.inferredPreferences,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "重新搜索失败";
        options.onError?.(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [inferredPreferences, options]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsAnalyzing(false);
      setIsSearching(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setChatState(null);
    setInferredPreferences(null);
    setUnderstandingText("");
    lastMessageRef.current = "";
  }, []);

  return {
    // 状态
    isLoading,
    isAnalyzing,
    isSearching,
    chatState,
    inferredPreferences,
    understandingText,

    // 新版两阶段流程
    analyzeIntent,
    confirmSearch,
    adjustPreferences,

    // 旧版兼容
    sendMessage,
    researchWithPreferences,

    // 通用
    cancel,
    resetState,
  };
}
