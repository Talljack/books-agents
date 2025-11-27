import { AgentState, Book } from "@/types/book";
import { searchGoogleBooks } from "@/lib/api/google-books";
import { searchOpenLibrary } from "@/lib/api/open-library";

export async function searchNode(state: AgentState): Promise<Partial<AgentState>> {
  const { query, filters } = state;

  try {
    // Search both APIs in parallel
    const [googleResults, openLibraryResults] = await Promise.all([
      searchGoogleBooks(query, filters, 10).catch(() => ({ books: [], totalItems: 0, query })),
      searchOpenLibrary(query, 10).catch(() => ({ books: [], totalItems: 0, query })),
    ]);

    // Merge and deduplicate results
    const allBooks = [...googleResults.books, ...openLibraryResults.books];
    const seenTitles = new Set<string>();
    const uniqueBooks: Book[] = [];

    for (const book of allBooks) {
      const titleKey = book.title.toLowerCase().trim();
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey);
        uniqueBooks.push(book);
      }
    }

    // Sort by relevance (books with more info rank higher)
    uniqueBooks.sort((a, b) => {
      const scoreA = (a.description ? 2 : 0) + (a.thumbnail ? 1 : 0) + (a.averageRating ? 1 : 0);
      const scoreB = (b.description ? 2 : 0) + (b.thumbnail ? 1 : 0) + (b.averageRating ? 1 : 0);
      return scoreB - scoreA;
    });

    return {
      books: uniqueBooks.slice(0, 20),
      messages: [
        ...state.messages,
        {
          role: "assistant",
          content: `Found ${uniqueBooks.length} books matching "${query}"`,
          timestamp: new Date(),
        },
      ],
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Search failed",
      messages: [
        ...state.messages,
        {
          role: "assistant",
          content: "Sorry, there was an error searching for books. Please try again.",
          timestamp: new Date(),
        },
      ],
    };
  }
}
