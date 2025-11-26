"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Hero } from "@/components/blocks/hero";
import { SearchBox } from "@/components/blocks/search-box";
import { BookCard } from "@/components/book/book-card";
import { BookGridSkeleton } from "@/components/book/book-skeleton";
import { Book } from "@/types/book";

export default function Home() {
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

      // Store results in session storage for detail page
      if (data.books?.length > 0) {
        sessionStorage.setItem("searchResults", JSON.stringify(data.books));
      }

      if (data.books?.length === 0) {
        toast("No books found. Try a different search term.", {
          icon: "📚",
        });
      } else {
        toast.success(`Found ${data.books.length} books`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again later.");
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      <Hero />

      <section className="container pb-20">
        {/* Search Box */}
        <div className="relative z-10 mx-auto -mt-8 max-w-2xl">
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
                  <h2 className="text-2xl font-semibold">Results for &quot;{lastQuery}&quot;</h2>
                  <span className="text-muted-foreground">{books.length} books found</span>
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
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No books found for &quot;{lastQuery}&quot;</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try searching with different keywords
                </p>
              </div>
            )
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>Search for books to get started</p>
              <p className="mt-2 text-sm">
                Try searching for titles, authors, or topics in any language
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
