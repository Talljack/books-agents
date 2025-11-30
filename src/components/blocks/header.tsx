"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Github, Moon, Sun, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  // 在搜索页面不显示全局 Header（搜索页有自己的 Header）
  if (pathname === "/search") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
        >
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg">BookFinder AI</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/search"
            className={cn(
              "flex items-center gap-1.5 text-sm transition-colors hover:text-foreground",
              pathname === "/search" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Search className="h-4 w-4" />
            搜索
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-1.5 text-sm transition-colors hover:text-foreground",
              pathname === "/settings" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            设置
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link href="/search">
              <Search className="h-5 w-5" />
              <span className="sr-only">搜索</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">设置</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
