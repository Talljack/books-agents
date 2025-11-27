import { NextRequest, NextResponse } from "next/server";
import { searchGoogleBooks } from "@/lib/api/google-books";
import { Book } from "@/types/book";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book, preferences } = body as {
      book?: Book;
      preferences?: string[];
    };

    // Build recommendation query based on book or preferences
    let query = "";

    if (book) {
      // Use book categories and authors for recommendations
      const terms: string[] = [];
      if (book.categories?.length) {
        terms.push(book.categories[0]);
      }
      if (book.authors?.length) {
        terms.push(`author:${book.authors[0]}`);
      }
      query = terms.join(" ");
    } else if (preferences?.length) {
      query = preferences.join(" ");
    } else {
      return NextResponse.json({ error: "Book or preferences required" }, { status: 400 });
    }

    const results = await searchGoogleBooks(query, undefined, 10);

    // Filter out the original book if present
    const recommendations = book ? results.books.filter((b) => b.id !== book.id) : results.books;

    return NextResponse.json({
      recommendations: recommendations.slice(0, 6),
      basedOn: book ? book.title : preferences?.join(", "),
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });
  }
}
