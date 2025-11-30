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

interface ChatInterfaceProps {
  onBooksFound?: (books: Book[]) => void;
  mode?: "basic" | "agent";
}

// 多语言配置
const i18n = {
  zh: {
    welcome: '你好！告诉我你想找什么书，我会先理解你的需求，让你确认后再搜索。\n\n例如：\n• "我想学习Python"\n• "推荐机器学习入门书籍"\n• "有什么好看的科幻小说"',
    welcomeBasic: '你好！我是你的图书助手。告诉我你想找什么书籍，我会帮你找到最合适的。\n\n例如：\n• "我想学习AI"\n• "推荐科幻小说"\n• "Python入门书籍"',
    analyzing: "正在理解您的需求...",
    thinking: "思考中...",
    searchingFor: (topic: string, level?: string) => level ? `好的，正在为您搜索${level}级别的${topic}书籍...` : `好的，正在为您搜索${topic}...`,
    cancelled: "好的，已取消搜索。请告诉我您想找什么书籍？",
    error: "抱歉，出现了问题。请再试一次。",
    searchError: "抱歉，搜索时出现了问题。请再试一次。",
    placeholder: "告诉我你想找什么书籍...",
    confirmHint: "请确认或调整搜索条件",
    inputHint: "输入后我会先理解您的需求",
    inputHintBasic: "由AI驱动 - 我会问一些问题来帮你找到最好的书籍",
    restart: "重新开始",
    phases: {
      analyzing: "分析中",
      confirming: "待确认",
      searching: "搜索中",
      complete: "完成",
    },
  },
  en: {
    welcome: 'Hello! Tell me what books you\'re looking for. I\'ll understand your needs first, then confirm before searching.\n\nFor example:\n• "I want to learn Python"\n• "Recommend machine learning books for beginners"\n• "Any good sci-fi novels?"',
    welcomeBasic: 'Hi! I\'m your book discovery assistant. Tell me what kind of books you\'re looking for.\n\nFor example:\n• "I want to learn about AI"\n• "Looking for sci-fi novels"\n• "Python beginner books"',
    analyzing: "Understanding your needs...",
    thinking: "Thinking...",
    searchingFor: (topic: string, level?: string) => level ? `OK, searching for ${level} level ${topic} books...` : `OK, searching for ${topic}...`,
    cancelled: "OK, search cancelled. What books are you looking for?",
    error: "Sorry, there was a problem. Please try again.",
    searchError: "Sorry, there was a problem searching. Please try again.",
    placeholder: "Tell me what books you're looking for...",
    confirmHint: "Please confirm or adjust search criteria",
    inputHint: "I'll understand your needs first",
    inputHintBasic: "Powered by AI - I'll ask questions to find the best books for you",
    restart: "Start Over",
    phases: {
      analyzing: "Analyzing",
      confirming: "Confirming",
      searching: "Searching",
      complete: "Complete",
    },
  },
};

// 检测用户输入语言
function detectLanguage(text: string): "zh" | "en" {
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  return hasChinese ? "zh" : "en";
}

export function ChatInterface({ onBooksFound, mode = "agent" }: ChatInterfaceProps) {
  const [userLang, setUserLang] = useState<"zh" | "en">("zh");
  const t = i18n[userLang];
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: mode === "agent" ? t.welcome : t.welcomeBasic,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    messageId: string;
    preferences: InferredPreferences;
    understandingText: string;
  } | null>(null);
  const [isBasicLoading, setIsBasicLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isLoading,
    isAnalyzing,
    isSearching,
    chatState,
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

  // 更新欢迎消息当语言变化
  useEffect(() => {
    setMessages((prev) => {
      if (prev[0]?.id === "welcome") {
        return [
          {
            ...prev[0],
            content: mode === "agent" ? i18n[userLang].welcome : i18n[userLang].welcomeBasic,
          },
          ...prev.slice(1),
        ];
      }
      return prev;
    });
  }, [userLang, mode]);

  // Agent 模式：分析意图
  const handleAgentSubmit = async (userMessage: ChatMessage) => {
    // 检测语言并更新
    const detectedLang = detectLanguage(userMessage.content);
    if (detectedLang !== userLang) {
      setUserLang(detectedLang);
    }

    const result = await analyzeIntent(userMessage.content);

    if (result) {
      setPendingConfirmation({
        messageId: userMessage.id,
        preferences: result.inferredPreferences,
        understandingText: result.understandingText,
      });
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: t.error,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Basic 模式：直接对话
  const handleBasicSubmit = async (userMessage: ChatMessage) => {
    // 检测语言并更新
    const detectedLang = detectLanguage(userMessage.content);
    if (detectedLang !== userLang) {
      setUserLang(detectedLang);
    }

    setIsBasicLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: "basic",
        }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        books: data.books,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.books?.length > 0 && onBooksFound) {
        onBooksFound(data.books);
        sessionStorage.setItem("searchResults", JSON.stringify(data.books));
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: t.error,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsBasicLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isBasicLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (mode === "agent") {
      await handleAgentSubmit(userMessage);
    } else {
      await handleBasicSubmit(userMessage);
    }

    inputRef.current?.focus();
  };

  // Agent 模式：确认搜索
  const handleConfirmSearch = async (preferences: InferredPreferences) => {
    if (!pendingConfirmation) return;

    setPendingConfirmation(null);

    const confirmMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: t.searchingFor(preferences.topic, preferences.isFiction ? undefined : preferences.levelLabel),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);

    const result = await confirmSearch(preferences);

    if (result) {
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
            ? { ...m, content: t.searchError }
            : m
        )
      );
    }
  };

  const handleCancelConfirmation = () => {
    setPendingConfirmation(null);
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: t.cancelled,
        timestamp: new Date(),
      },
    ]);
  };

  const handleAdjustPreference = (adjusted: Partial<InferredPreferences>) => {
    if (pendingConfirmation) {
      setPendingConfirmation({
        ...pendingConfirmation,
        preferences: { ...pendingConfirmation.preferences, ...adjusted },
      });
    }
    adjustPreferences(adjusted);
  };

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
        content: mode === "agent" ? t.welcome : t.welcomeBasic,
        timestamp: new Date(),
      },
    ]);
    setPendingConfirmation(null);
    resetState();
  };

  const currentLoading = mode === "agent" ? isLoading : isBasicLoading;

  return (
    <div className="mx-auto flex h-[650px] max-w-3xl flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {mode === "agent" ? "LangGraph AI Agent" : "AI Chat"}
          </span>
          {mode === "agent" && chatState?.phase && (
            <Badge variant="outline" className="text-xs">
              {t.phases[chatState.phase as keyof typeof t.phases] || chatState.phase}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
          <RefreshCw className="h-3 w-3" />
          {t.restart}
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

                {/* Preference chips for adjustment (after search) - Agent mode only */}
                {mode === "agent" && message.inferredPreferences && message.books && message.books.length > 0 && (
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
                    {message.books.slice(0, mode === "basic" ? 4 : undefined).map((book) => (
                      <BookCard key={book.id} book={book} compact />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Intent Confirmation Card - Agent mode only */}
        {mode === "agent" && (
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
        )}

        {/* Loading indicator */}
        {(isAnalyzing || isBasicLoading) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Bot className="h-4 w-4" />
            </div>
            <Card className="bg-muted p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  {mode === "agent" ? t.analyzing : t.thinking}
                </span>
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
            placeholder={t.placeholder}
            disabled={currentLoading || (mode === "agent" && !!pendingConfirmation)}
            className="flex-1"
          />
          <Button type="submit" disabled={currentLoading || !input.trim() || (mode === "agent" && !!pendingConfirmation)}>
            {currentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <BookOpen className="mr-1 inline h-3 w-3" />
          {mode === "agent" 
            ? (pendingConfirmation ? t.confirmHint : t.inputHint)
            : t.inputHintBasic
          }
        </p>
      </div>
    </div>
  );
}

// 导出 V2 别名以保持向后兼容
export { ChatInterface as ChatInterfaceV2 };
