"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import { 
  MessageSquare, 
  Search, 
  Sparkles, 
  ArrowLeft,
  BookOpen,
  Settings
} from "lucide-react";
import { SearchBox } from "@/components/blocks/search-box";
import { BookCard } from "@/components/book/book-card";
import { BookGridSkeleton } from "@/components/book/book-skeleton";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Book } from "@/types/book";

type Mode = "langgraph" | "chat" | "search";

const modeConfig = {
  langgraph: {
    icon: Sparkles,
    label: "AI Agent",
    description: "智能对话，理解需求后搜索",
  },
  chat: {
    icon: MessageSquare,
    label: "基础对话",
    description: "简单对话式搜索",
  },
  search: {
    icon: Search,
    label: "快速搜索",
    description: "直接关键词搜索",
  },
};

export default function SearchPage() {
  const [mode, setMode] = useState<Mode>("langgraph");
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setLastQuery(query);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setBooks(data.books || []);

      if (data.books?.length > 0) {
        sessionStorage.setItem("searchResults", JSON.stringify(data.books));
      }

      if (data.books?.length === 0) {
        toast("没有找到相关书籍，试试其他关键词", { icon: "📚" });
      } else {
        toast.success(`找到 ${data.books.length} 本书籍`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("搜索失败，请稍后重试");
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBooksFound = useCallback((foundBooks: Book[]) => {
    setBooks(foundBooks);
    setHasSearched(true);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">返回首页</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">BookFinder AI</span>
            </div>
          </div>
          
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              模型设置
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Mode Toggle */}
        <div className="mb-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">搜索书籍</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  选择搜索模式，开始发现好书
                </p>
              </div>
              
              {/* Mode Selector */}
              <Card className="inline-flex gap-1 p-1">
                {(Object.keys(modeConfig) as Mode[]).map((m) => {
                  const config = modeConfig[m];
                  const Icon = config.icon;
                  return (
                    <Button
                      key={m}
                      variant={mode === m ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMode(m)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{config.label}</span>
                    </Button>
                  );
                })}
              </Card>
            </div>

            {/* Mode Description */}
            <motion.p
              key={mode}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-muted-foreground"
            >
              {modeConfig[mode].description}
            </motion.p>
          </div>
        </div>

        {/* Content based on mode */}
        <AnimatePresence mode="wait">
          {mode === "langgraph" ? (
            <motion.div
              key="langgraph"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="mx-auto max-w-3xl overflow-hidden border-white/5 bg-white/[0.02]">
                <ChatInterface onBooksFound={handleBooksFound} mode="agent" />
              </Card>
            </motion.div>
          ) : mode === "chat" ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="mx-auto max-w-3xl overflow-hidden border-white/5 bg-white/[0.02]">
                <ChatInterface onBooksFound={handleBooksFound} mode="basic" />
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Search Box */}
              <div className="mx-auto max-w-2xl">
                <SearchBox onSearch={handleSearch} isLoading={isLoading} />
              </div>

              {/* Results */}
              <div className="mt-12">
                {isLoading ? (
                  <BookGridSkeleton count={6} />
                ) : hasSearched ? (
                  books.length > 0 ? (
                    <>
                      <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                          「{lastQuery}」的搜索结果
                        </h2>
                        <span className="text-sm text-muted-foreground">
                          共 {books.length} 本
                        </span>
                      </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                      >
                        <AnimatePresence mode="popLayout">
                          {books.map((book, index) => (
                            <motion.div
                              key={book.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <BookCard book={book} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    </>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium">
                        没有找到「{lastQuery}」相关的书籍
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        试试其他关键词或切换到 AI Agent 模式获得更智能的推荐
                      </p>
                    </div>
                  )
                ) : (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium">输入关键词开始搜索</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      支持书名、作者、主题等多语言搜索
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

