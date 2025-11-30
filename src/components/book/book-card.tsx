"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, BookOpen, User, ExternalLink, BookMarked } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Book } from "@/types/book";
import { truncateText, getBookCoverUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface BookCardProps {
  book: Book;
  className?: string;
  compact?: boolean;
}

// 书籍封面组件 - 处理豆瓣图片的特殊情况
function BookCover({
  src,
  alt,
  className,
  fill,
  sizes,
  isDouban,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  isDouban?: boolean;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 豆瓣图片或加载失败时使用普通 img 标签
  if (isDouban || error) {
    return (
      <div className={cn("relative", fill && "absolute inset-0")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={error ? "/book-placeholder.svg" : src}
          alt={alt}
          className={cn(
            className,
            fill && "h-full w-full",
            !loaded && "opacity-0",
            loaded && "opacity-100 transition-opacity duration-300"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
        {!loaded && !error && <div className="absolute inset-0 animate-pulse bg-muted" />}
      </div>
    );
  }

  // 非豆瓣图片使用 Next.js Image
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      onError={() => setError(true)}
    />
  );
}

// 数据源标签配置
const sourceConfig: Record<string, { label: string; color: string }> = {
  google: { label: "Google", color: "bg-blue-100 text-blue-700" },
  openlibrary: { label: "Open Library", color: "bg-green-100 text-green-700" },
  internetarchive: { label: "可在线阅读", color: "bg-purple-100 text-purple-700" },
  douban: { label: "豆瓣", color: "bg-emerald-100 text-emerald-700" },
};

export function BookCard({ book, className, compact = false }: BookCardProps) {
  const coverUrl = getBookCoverUrl(book);
  const sourceInfo = sourceConfig[book.source] || {
    label: book.source,
    color: "bg-gray-100 text-gray-700",
  };
  const isDouban = book.source === "douban" || coverUrl.includes("doubanio.com");

  if (compact) {
    return (
      <Card
        className={cn(
          "group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
          className
        )}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Small Cover */}
            <Link
              href={`/book/${encodeURIComponent(book.id)}`}
              className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-muted"
            >
              <BookCover
                src={coverUrl}
                alt={book.title}
                fill
                className="object-cover"
                sizes="48px"
                isDouban={isDouban}
              />
            </Link>
            {/* Info */}
            <div className="min-w-0 flex-1">
              <Link href={`/book/${encodeURIComponent(book.id)}`}>
                <h4 className="line-clamp-1 text-sm font-medium group-hover:text-primary">
                  {book.title}
                </h4>
              </Link>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {book.authors.join(", ")}
              </p>
              <div className="mt-1 flex items-center gap-2">
                {/* 评分 */}
                {(book.averageRating || book.doubanRating) && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">
                      {(book.doubanRating || book.averageRating)?.toFixed(1)}
                    </span>
                  </div>
                )}
                {/* 在线阅读标记 */}
                {book.readOnlineLink && (
                  <Badge variant="outline" className="h-4 px-1 text-[10px] text-purple-600">
                    <BookMarked className="mr-0.5 h-2 w-2" />
                    在线读
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Book Cover */}
          <Link
            href={`/book/${encodeURIComponent(book.id)}`}
            className="relative h-48 flex-shrink-0 bg-muted sm:h-auto sm:w-32"
          >
            <BookCover
              src={coverUrl}
              alt={book.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 128px"
              isDouban={isDouban}
            />
            <Badge className={cn("absolute left-2 top-2 text-xs", sourceInfo.color)}>
              {sourceInfo.label}
            </Badge>
          </Link>

          {/* Book Info */}
          <div className="flex-1 p-4">
            <Link href={`/book/${encodeURIComponent(book.id)}`}>
              <h3 className="line-clamp-2 text-lg font-semibold leading-tight transition-colors group-hover:text-primary">
                {book.title}
              </h3>
            </Link>

            {/* Authors */}
            <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="line-clamp-1">{book.authors.join(", ")}</span>
            </div>

            {/* Rating - 优先显示豆瓣评分 */}
            {(book.averageRating || book.doubanRating) && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {(book.doubanRating || book.averageRating)?.toFixed(1)}
                  </span>
                  {book.ratingsCount && (
                    <span className="text-xs text-muted-foreground">
                      ({book.ratingsCount.toLocaleString()})
                    </span>
                  )}
                </div>
                {book.doubanUrl && (
                  <a
                    href={book.doubanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    豆瓣
                  </a>
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

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              {/* Page count */}
              {book.pageCount && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3" />
                  <span>{book.pageCount} pages</span>
                </div>
              )}

              {/* 在线阅读按钮 */}
              {book.readOnlineLink && (
                <a
                  href={book.readOnlineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 gap-1 px-2 text-xs text-purple-600 hover:bg-purple-50"
                  >
                    <BookMarked className="h-3 w-3" />
                    在线阅读
                    <ExternalLink className="h-2 w-2" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
