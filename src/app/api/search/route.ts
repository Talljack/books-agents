import { NextRequest, NextResponse } from "next/server";
import { runBookSearch } from "@/lib/agents/book-agent";
import { SearchFilters } from "@/types/book";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters } = body as {
      query: string;
      filters?: SearchFilters;
    };

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const result = await runBookSearch(query.trim(), filters);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      books: result.books,
      total: result.books.length,
      query,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Failed to search books" }, { status: 500 });
  }
}
