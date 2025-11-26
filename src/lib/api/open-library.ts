import { Book, SearchResult } from "@/types/book";
import { generateBookId } from "@/lib/utils";

const OPEN_LIBRARY_API_BASE = "https://openlibrary.org";

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  number_of_pages_median?: number;
  subject?: string[];
  language?: string[];
  cover_i?: number;
  isbn?: string[];
  ratings_average?: number;
  ratings_count?: number;
}

interface OpenLibrarySearchResponse {
  docs: OpenLibraryDoc[];
  numFound: number;
}

function transformOpenLibraryBook(doc: OpenLibraryDoc): Book {
  const workId = doc.key.replace("/works/", "");
  const coverUrl = doc.cover_i
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    : undefined;

  return {
    id: generateBookId("openlibrary", workId),
    title: doc.title,
    authors: doc.author_name || ["Unknown Author"],
    publishedDate: doc.first_publish_year?.toString(),
    publisher: doc.publisher?.[0],
    pageCount: doc.number_of_pages_median,
    categories: doc.subject?.slice(0, 5),
    language: doc.language?.[0],
    thumbnail: coverUrl,
    infoLink: `${OPEN_LIBRARY_API_BASE}${doc.key}`,
    averageRating: doc.ratings_average,
    ratingsCount: doc.ratings_count,
    isbn: doc.isbn?.[0],
    source: "openlibrary",
  };
}

export async function searchOpenLibrary(query: string, limit: number = 20): Promise<SearchResult> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    fields:
      "key,title,author_name,first_publish_year,publisher,number_of_pages_median,subject,language,cover_i,isbn,ratings_average,ratings_count",
  });

  const response = await fetch(`${OPEN_LIBRARY_API_BASE}/search.json?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Open Library API error: ${response.status}`);
  }

  const data: OpenLibrarySearchResponse = await response.json();

  return {
    books: data.docs.map(transformOpenLibraryBook),
    totalItems: data.numFound,
    query,
  };
}

export async function getOpenLibraryBookDescription(workId: string): Promise<string | null> {
  try {
    const response = await fetch(`${OPEN_LIBRARY_API_BASE}/works/${workId}.json`);
    if (!response.ok) return null;

    const data = await response.json();
    if (typeof data.description === "string") {
      return data.description;
    }
    if (data.description?.value) {
      return data.description.value;
    }
    return null;
  } catch {
    return null;
  }
}
