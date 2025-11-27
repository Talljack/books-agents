"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, BookOpen, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book } from "@/types/book";
import { truncateText, getBookCoverUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BookCardProps {
  book: Book;
  className?: string;
}

export function BookCard({ book, className }: BookCardProps) {
  const coverUrl = getBookCoverUrl(book);

  return (
    <Link href={`/book/${encodeURIComponent(book.id)}`}>
      <Card
        className={cn(
          "group h-full cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
          className
        )}
      >
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Book Cover */}
            <div className="relative h-48 flex-shrink-0 bg-muted sm:h-auto sm:w-32">
              <Image
                src={coverUrl}
                alt={book.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 128px"
              />
              {book.source === "google" && (
                <Badge variant="secondary" className="absolute left-2 top-2 text-xs">
                  Google
                </Badge>
              )}
            </div>

            {/* Book Info */}
            <div className="flex-1 p-4">
              <h3 className="line-clamp-2 text-lg font-semibold leading-tight transition-colors group-hover:text-primary">
                {book.title}
              </h3>

              {/* Authors */}
              <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="line-clamp-1">{book.authors.join(", ")}</span>
              </div>

              {/* Rating */}
              {book.averageRating && (
                <div className="mt-2 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{book.averageRating.toFixed(1)}</span>
                  {book.ratingsCount && (
                    <span className="text-xs text-muted-foreground">
                      ({book.ratingsCount.toLocaleString()})
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              {book.description && (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {truncateText(book.description, 150)}
                </p>
              )}

              {/* Categories */}
              {book.categories && book.categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {book.categories.slice(0, 2).map((category, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Page count */}
              {book.pageCount && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3" />
                  <span>{book.pageCount} pages</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
