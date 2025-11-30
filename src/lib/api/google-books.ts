import { Book, SearchFilters, SearchResult } from "@/types/book";
import { generateBookId } from "@/lib/utils";

const GOOGLE_BOOKS_API_BASE = "https://www.googleapis.com/books/v1/volumes";

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    publisher?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    previewLink?: string;
    infoLink?: string;
    averageRating?: number;
    ratingsCount?: number;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

interface GoogleBooksResponse {
  items?: GoogleBooksVolume[];
  totalItems: number;
}

function transformGoogleBook(volume: GoogleBooksVolume): Book {
  const info = volume.volumeInfo;
  const isbn = info.industryIdentifiers?.find(
    (id) => id.type === "ISBN_13" || id.type === "ISBN_10"
  )?.identifier;

  return {
    id: generateBookId("google", volume.id),
    title: info.title,
    authors: info.authors || ["Unknown Author"],
    description: info.description,
    publishedDate: info.publishedDate,
    publisher: info.publisher,
    pageCount: info.pageCount,
    categories: info.categories,
    language: info.language,
    thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://"),
    previewLink: info.previewLink,
    infoLink: info.infoLink,
    averageRating: info.averageRating,
    ratingsCount: info.ratingsCount,
    isbn,
    source: "google",
  };
}

export async function searchGoogleBooks(
  query: string,
  filters?: SearchFilters,
  maxResults: number = 20
): Promise<SearchResult> {
  // Google Books API 最大返回 40 条结果
  const actualMaxResults = Math.min(maxResults, 40);

  const params = new URLSearchParams({
    q: query,
    maxResults: actualMaxResults.toString(),
    orderBy: filters?.orderBy || "relevance",
  });

  if (filters?.language) {
    params.append("langRestrict", filters.language);
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    params.append("key", apiKey);
  }

  const url = `${GOOGLE_BOOKS_API_BASE}?${params.toString()}`;
  console.log(`[GoogleBooks] Fetching: ${url.substring(0, 100)}...`);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(`[GoogleBooks] API error ${response.status}: ${errorText.substring(0, 200)}`);
    throw new Error(`Google Books API error: ${response.status}`);
  }

  const data: GoogleBooksResponse = await response.json();

  return {
    books: (data.items || []).map(transformGoogleBook),
    totalItems: data.totalItems,
    query,
  };
}

export async function getGoogleBookById(bookId: string): Promise<Book | null> {
  const response = await fetch(`${GOOGLE_BOOKS_API_BASE}/${bookId}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Google Books API error: ${response.status}`);
  }

  const volume: GoogleBooksVolume = await response.json();
  return transformGoogleBook(volume);
}
