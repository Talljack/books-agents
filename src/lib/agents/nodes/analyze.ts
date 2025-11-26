import { AgentState, BookAnalysis } from "@/types/book";
import { generateBookAnalysis } from "@/lib/openai";
import { getOpenLibraryBookDescription } from "@/lib/api/open-library";
import { parseBookId } from "@/lib/utils";

export async function analyzeNode(state: AgentState): Promise<Partial<AgentState>> {
  const { selectedBook } = state;

  if (!selectedBook) {
    return {
      error: "No book selected for analysis",
    };
  }

  try {
    // If the book is from Open Library and missing description, fetch it
    let description = selectedBook.description;
    if (!description && selectedBook.source === "openlibrary") {
      const { id } = parseBookId(selectedBook.id);
      description = (await getOpenLibraryBookDescription(id)) || undefined;
    }

    // Prepare book information for AI analysis
    const bookInfo = `
Title: ${selectedBook.title}
Authors: ${selectedBook.authors.join(", ")}
${description ? `Description: ${description}` : ""}
${selectedBook.publisher ? `Publisher: ${selectedBook.publisher}` : ""}
${selectedBook.publishedDate ? `Published: ${selectedBook.publishedDate}` : ""}
${selectedBook.pageCount ? `Pages: ${selectedBook.pageCount}` : ""}
${selectedBook.categories?.length ? `Categories: ${selectedBook.categories.join(", ")}` : ""}
${selectedBook.averageRating ? `Rating: ${selectedBook.averageRating}/5 (${selectedBook.ratingsCount} reviews)` : ""}
`.trim();

    const analysisJson = await generateBookAnalysis(bookInfo);
    const analysis: BookAnalysis = JSON.parse(analysisJson);

    return {
      analysis,
      messages: [
        ...state.messages,
        {
          role: "assistant",
          content: `I've analyzed "${selectedBook.title}" for you. Here's what I found...`,
          timestamp: new Date(),
        },
      ],
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Analysis failed",
      messages: [
        ...state.messages,
        {
          role: "assistant",
          content: "Sorry, I couldn't analyze this book. Please try again.",
          timestamp: new Date(),
        },
      ],
    };
  }
}
