"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  BookOpen,
  Calendar,
  Building,
  Globe,
  ExternalLink,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AIAnalysis } from "@/components/book/ai-analysis";
import { Book, BookAnalysis } from "@/types/book";
import { getBookCoverUrl, parseBookId, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const bookId = decodeURIComponent(params.id || "");

  const [book, setBook] = useState<Book | null>(null);
  const [analysis, setAnalysis] = useState<BookAnalysis | null>(null);
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load book data from session storage or fetch
  useEffect(() => {
    // Try to get book from session storage first
    const storedBooks = sessionStorage.getItem("searchResults");
    if (storedBooks) {
      const books: Book[] = JSON.parse(storedBooks);
      const foundBook = books.find((b) => b.id === bookId);
      if (foundBook) {
        setBook(foundBook);
        setIsLoadingBook(false);
        return;
      }
    }

    // If not in storage, we need to fetch it
    // For now, just show not found
    setIsLoadingBook(false);
  }, [bookId]);

  const handleAnalyze = async () => {
    if (!book || isAnalyzing) return;

    setIsAnalyzing(true);
    setIsLoadingAnalysis(true);

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
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze book. Please try again later.");
    } finally {
      setIsAnalyzing(false);
      setIsLoadingAnalysis(false);
    }
  };

  if (isLoadingBook) {
    return <BookDetailSkeleton />;
  }

  if (!book) {
    return (
      <div className="container py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </Link>
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold">Book not found</h1>
          <p className="mt-2 text-muted-foreground">Please search for a book first</p>
        </div>
      </div>
    );
  }

  const coverUrl = getBookCoverUrl(book);
  const { source } = parseBookId(book.id);

  return (
    <div className="container py-8">
      {/* Back button */}
      <Link href="/">
        <Button variant="ghost" className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>
      </Link>

      <div className="grid gap-8 lg:grid-cols-[350px_1fr]">
        {/* Left column - Book cover and info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Cover */}
          <Card className="overflow-hidden">
            <div className="relative aspect-[2/3] bg-muted">
              <Image
                src={coverUrl}
                alt={book.title}
                fill
                className="object-cover"
                sizes="350px"
                priority
              />
            </div>
          </Card>

          {/* Quick info */}
          <Card>
            <CardContent className="space-y-3 p-4">
              {book.averageRating && (
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{book.averageRating.toFixed(1)}</span>
                  {book.ratingsCount && (
                    <span className="text-sm text-muted-foreground">
                      ({book.ratingsCount.toLocaleString()} reviews)
                    </span>
                  )}
                </div>
              )}

              {book.pageCount && (
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{book.pageCount} pages</span>
                </div>
              )}

              {book.publishedDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(book.publishedDate)}</span>
                </div>
              )}

              {book.publisher && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{book.publisher}</span>
                </div>
              )}

              {book.language && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{book.language.toUpperCase()}</span>
                </div>
              )}

              <Badge variant="outline" className="text-xs">
                Source: {source === "google" ? "Google Books" : "Open Library"}
              </Badge>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            {book.previewLink && (
              <Button asChild className="w-full">
                <a href={book.previewLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview Book
                </a>
              </Button>
            )}
            {book.infoLink && (
              <Button variant="outline" asChild className="w-full">
                <a href={book.infoLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  More Info
                </a>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Right column - Details and AI analysis */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          {/* Title and authors */}
          <div>
            <h1 className="text-3xl font-bold">{book.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">by {book.authors.join(", ")}</p>
          </div>

          {/* Categories */}
          {book.categories && book.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {book.categories.map((category, i) => (
                <Badge key={i} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          {book.description && (
            <div>
              <h2 className="mb-3 text-xl font-semibold">About this book</h2>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                {book.description}
              </p>
            </div>
          )}

          {/* AI Analysis Section */}
          <div className="border-t pt-4">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Analysis
              </h2>
              {!analysis && (
                <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze This Book
                    </>
                  )}
                </Button>
              )}
            </div>

            {analysis || isLoadingAnalysis ? (
              <AIAnalysis analysis={analysis} isLoading={isLoadingAnalysis} />
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="py-12 text-center">
                  <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Click &quot;Analyze This Book&quot; to get AI-powered insights
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Learn if this book matches your interests
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function BookDetailSkeleton() {
  return (
    <div className="container py-8">
      <Skeleton className="mb-8 h-10 w-32" />
      <div className="grid gap-8 lg:grid-cols-[350px_1fr]">
        <div className="space-y-6">
          <Skeleton className="aspect-[2/3] rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
