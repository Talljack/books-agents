import { AgentState, BookAnalysis } from "@/types/book";
import { getOpenLibraryBookDescription } from "@/lib/api/open-library";
import { parseBookId } from "@/lib/utils";
import { createLLM } from "@/lib/llm/factory";

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

    // Use LLM factory to create model instance
    const llm = createLLM();
    
    const systemPrompt = `You are a professional book analyst and reading advisor. Your task is to analyze books and help readers determine if a book matches their interests.

Provide your analysis in the following JSON format:
{
  "summary": "A concise 2-3 sentence summary of what the book is about",
  "themes": ["theme1", "theme2", "theme3"],
  "targetAudience": "Description of who would enjoy this book",
  "difficulty": "beginner|intermediate|advanced",
  "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"],
  "shouldRead": {
    "score": 0-100,
    "reasons": ["reason1", "reason2", "reason3"]
  },
  "similarBooks": ["book1", "book2", "book3"]
}

Be helpful, concise, and focus on helping the reader decide if this book is right for them.`;

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Please analyze this book and respond with valid JSON only:\n\n${bookInfo}`,
      },
    ]);

    const analysisJson = response.content.toString();
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
