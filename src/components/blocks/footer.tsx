"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Heart, Github, Twitter } from "lucide-react";

export function Footer() {
  const pathname = usePathname();
  
  // 在搜索页面使用简化的 Footer
  if (pathname === "/search") {
    return (
      <footer className="border-t border-white/5 py-4">
        <div className="container">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            <span>BookFinder AI</span>
            <span>·</span>
            <span>Powered by LangGraph</span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-white/5 bg-black/20 py-12">
      <div className="container">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-lg">BookFinder AI</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              用 AI 发现你的下一本好书。整合多个数据源，支持多种 AI 模型，让阅读发现更简单。
            </p>
            <div className="mt-4 flex gap-2">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <Github className="h-4 w-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">产品</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/search" className="transition-colors hover:text-foreground">
                  搜索书籍
                </Link>
              </li>
              <li>
                <Link href="/settings" className="transition-colors hover:text-foreground">
                  模型设置
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">数据源</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="https://book.douban.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                  豆瓣读书
                </a>
              </li>
              <li>
                <a href="https://books.google.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                  Google Books
                </a>
              </li>
              <li>
                <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                  Open Library
                </a>
              </li>
              <li>
                <a href="https://archive.org" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                  Internet Archive
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            <span>using Next.js & LangGraph</span>
          </div>

          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BookFinder AI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
