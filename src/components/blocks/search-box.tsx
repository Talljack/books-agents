"use client";

import { useState, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBoxProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchBox({
  onSearch,
  isLoading = false,
  placeholder = "Search for books by title, author, or topic...",
  className,
}: SearchBoxProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        onSearch(query.trim());
      }
    },
    [query, onSearch, isLoading]
  );

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-12 pl-10 text-base"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" size="lg" disabled={isLoading || !query.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
