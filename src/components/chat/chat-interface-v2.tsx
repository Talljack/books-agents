"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Bot, User, BookOpen, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookCard } from "@/components/book/book-card";
import { PreferenceChips } from "./preference-chips";
import { IntentConfirmation } from "./intent-confirmation";
import { Book } from "@/types/book";
import { useChatStream, InferredPreferences } from "@/hooks/use-chat-stream";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  books?: Book[];
  inferredPreferences?: InferredPreferences;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatInterfaceV2Props {
  onBooksFound?: (books: Book[]) => void;
}

export function ChatInterfaceV2({ onBooksFound }: ChatInterfaceV2Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        '你好！告诉我你想找什么书，我会先理解你的需求，让你确认后再搜索。\n\n例如：\n• "我想学习Python"\n• "推荐机器学习入门书籍"\n• "有什么好看的科幻小说"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    messageId: string;
    preferences: InferredPreferences;
    understandingText: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isLoading,
    isAnalyzing,
    isSearching,
    chatState,
    inferredPreferences,
    understandingText,
    analyzeIntent,
    confirmSearch,
    adjustPreferences,
    researchWithPreferences,
    resetState,
  } = useChatStream({
    onBooks: (books) => {
      if (onBooksFound) {
        onBooksFound(books);
        sessionStorage.setItem("searchResults", JSON.stringify(books));
      }
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingConfirmation, scrollToBottom]);

  // 第一阶段：分析意图
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // 调用意图分析 API
    const result = await analyzeIntent(userMessage.content);

    if (result) {
      // 设置待确认状态
      setPendingConfirmation({
        messageId: userMessage.id,
        preferences: result.inferredPreferences,
        understandingText: result.understandingText,
      });
    } else {
      // 分析失败
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "抱歉，理解您的需求时出现了问题。请再试一次。",
          timestamp: new Date(),
        },
      ]);
    }

    inputRef.current?.focus();
  };

  // 第二阶段：确认搜索
  const handleConfirmSearch = async (preferences: InferredPreferences) => {
    if (!pendingConfirmation) return;

    setPendingConfirmation(null);

    // 添加确认消息
    const confirmMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: preferences.isFiction
        ? `好的，正在为您搜索${preferences.topic}...`
        : `好的，正在为您搜索${preferences.levelLabel}级别的${preferences.topic}书籍...`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);

    // 执行搜索
    const result = await confirmSearch(preferences);

    if (result) {
      // 更新消息显示搜索结果
      setMessages((prev) =>
        prev.map((m) =>
          m.id === confirmMessage.id
            ? {
                ...m,
                content: result.message,
                books: result.books,
                inferredPreferences: result.preferences,
              }
            : m
        )
      );
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === confirmMessage.id
            ? {
                ...m,
                content: "抱歉，搜索时出现了问题。请再试一次。",
              }
            : m
        )
      );
    }
  };

  // 取消确认
  const handleCancelConfirmation = () => {
    setPendingConfirmation(null);
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "好的，已取消搜索。请告诉我您想找什么书籍？",
        timestamp: new Date(),
      },
    ]);
  };

  // 调整偏好
  const handleAdjustPreference = (adjusted: Partial<InferredPreferences>) => {
    if (pendingConfirmation) {
      setPendingConfirmation({
        ...pendingConfirmation,
        preferences: { ...pendingConfirmation.preferences, ...adjusted },
      });
    }
    adjustPreferences(adjusted);
  };

  // 处理偏好调整（搜索结果后的调整）
  const handlePreferenceAdjust = async (messageId: string, adjusted: Partial<InferredPreferences>) => {
    const result = await researchWithPreferences(adjusted);

    if (result) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: result.message,
                books: result.books,
                inferredPreferences: result.inferredPreferences,
              }
            : m
        )
      );
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: '你好！告诉我你想找什么书，我会先理解你的需求，让你确认后再搜索。',
        timestamp: new Date(),
      },
    ]);
    setPendingConfirmation(null);
    resetState();
  };

  return (
    <div className="mx-auto flex h-[650px] max-w-3xl flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">LangGraph AI Agent</span>
          {chatState?.phase && (
            <Badge variant="outline" className="text-xs">
              {chatState.phase === "analyzing"
                ? "分析中"
                : chatState.phase === "confirming"
                  ? "待确认"
                  : chatState.phase === "searching"
                    ? "搜索中"
                    : "完成"}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
          <RefreshCw className="h-3 w-3" />
          重新开始
        </Button>
      </div>

      {/* Chat messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message content */}
              <div className={`max-w-[80%] flex-1 ${message.role === "user" ? "text-right" : ""}`}>
                <Card
                  className={`inline-block p-3 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </Card>

                {/* Preference chips for adjustment (after search) */}
                {message.inferredPreferences && message.books && message.books.length > 0 && (
                  <div className="mt-2">
                    <PreferenceChips
                      preferences={message.inferredPreferences}
                      onAdjust={(adjusted) => handlePreferenceAdjust(message.id, adjusted)}
                      isLoading={isLoading}
                    />
                  </div>
                )}

                {/* Show books if any */}
                {message.books && message.books.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {message.books.map((book) => (
                      <BookCard key={book.id} book={book} compact />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Intent Confirmation Card */}
        <AnimatePresence>
          {pendingConfirmation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <IntentConfirmation
                  preferences={pendingConfirmation.preferences}
                  understandingText={pendingConfirmation.understandingText}
                  onConfirm={handleConfirmSearch}
                  onCancel={handleCancelConfirmation}
                  onAdjust={handleAdjustPreference}
                  isLoading={isSearching}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {isAnalyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Bot className="h-4 w-4" />
            </div>
            <Card className="bg-muted p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">正在理解您的需求...</span>
              </div>
            </Card>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="告诉我你想找什么书籍..."
            disabled={isLoading || !!pendingConfirmation}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim() || !!pendingConfirmation}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <BookOpen className="mr-1 inline h-3 w-3" />
          {pendingConfirmation ? "请确认或调整搜索条件" : "输入后我会先理解您的需求"}
        </p>
      </div>
    </div>
  );
}
