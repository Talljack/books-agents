import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | undefined): string {
  if (!date) return "Unknown";
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function getBookCoverUrl(book: { thumbnail?: string; isbn?: string }): string {
  if (book.thumbnail) return book.thumbnail;
  if (book.isbn) {
    return `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
  }
  return "/book-placeholder.svg";
}

export function generateBookId(source: string, id: string): string {
  return `${source}_${id}`;
}

export function parseBookId(bookId: string): { source: string; id: string } {
  const [source, ...idParts] = bookId.split("_");
  return { source, id: idParts.join("_") };
}
