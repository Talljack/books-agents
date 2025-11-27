import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { searchGoogleBooks } from "@/lib/api/google-books";
import { searchOpenLibrary } from "@/lib/api/open-library";
import { Book } from "@/types/book";

// Support both OpenAI and OpenRouter
const isOpenRouter = !!process.env.OPENROUTER_API_KEY;

const openai = new OpenAI({
  apiKey: isOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY,
  baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
  defaultHeaders: isOpenRouter
    ? {
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "BookFinder AI",
      }
    : undefined,
});

const MODEL = isOpenRouter ? process.env.OPENROUTER_MODEL || "qwen/qwen3-235b-a22b:free" : "gpt-4o";

const SYSTEM_PROMPT = `You are a helpful book discovery assistant. Your job is to help users find the perfect books.

IMPORTANT RULES:
1. When a user asks for books, ALWAYS ask 1-2 clarifying questions first to understand their preferences better. Ask about:
   - Specific topics or themes they're interested in
   - Their experience level (beginner, intermediate, advanced)
   - Whether they prefer practical/hands-on or theoretical books
   - Language preference if not clear
   - Publication date preference (latest vs classics)

2. After gathering enough information (usually 1-2 exchanges), indicate you're ready to search by including "[SEARCH: <optimized search query>]" in your response.

3. Keep your responses concise and friendly.

4. If the user's request is already very specific, you can search immediately.

Example conversation:
User: "I want to learn about AI"
Assistant: "Great choice! AI is a vast field. To help you find the best books:
- Are you interested in machine learning, deep learning, or AI applications?
- What's your technical background? (beginner/some programming/advanced)"

User: "I'm a beginner interested in machine learning with Python"
Assistant: "Perfect! I'll find some beginner-friendly machine learning books with Python focus. [SEARCH: machine learning Python beginner introduction]"

Remember: Be conversational, helpful, and guide users to better book choices through questions.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = (await request.json()) as {
      message: string;
      history: ChatMessage[];
    };

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build conversation history
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";

    // Check if the response contains a search command
    const searchMatch = aiResponse.match(/\[SEARCH:\s*([^\]]+)\]/i);
    let books: Book[] = [];
    let cleanResponse = aiResponse;

    if (searchMatch) {
      const searchQuery = searchMatch[1].trim();
      cleanResponse = aiResponse.replace(/\[SEARCH:[^\]]+\]/gi, "").trim();

      // Add a message about searching
      if (
        !cleanResponse.toLowerCase().includes("searching") &&
        !cleanResponse.toLowerCase().includes("找")
      ) {
        cleanResponse += "\n\nSearching for books...";
      }

      // Perform the search
      try {
        const [googleResults, openLibraryResults] = await Promise.all([
          searchGoogleBooks(searchQuery, undefined, 6),
          searchOpenLibrary(searchQuery, 6),
        ]);

        // Combine and deduplicate
        const allBooks = [...googleResults.books, ...openLibraryResults.books];
        const seen = new Set<string>();
        books = allBooks
          .filter((book) => {
            const key = `${book.title.toLowerCase()}-${book.authors.join(",").toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 8);

        if (books.length > 0) {
          cleanResponse = cleanResponse.replace(
            /Searching for books\.\.\./,
            `Here are ${books.length} books I found for you:`
          );
        } else {
          cleanResponse +=
            " Unfortunately, I couldn't find any books matching those criteria. Could you try different keywords?";
        }
      } catch (searchError) {
        console.error("Search error:", searchError);
        cleanResponse += " Sorry, I had trouble searching for books. Please try again.";
      }
    }

    return NextResponse.json({
      message: cleanResponse,
      books: books.length > 0 ? books : undefined,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
