import { NextRequest, NextResponse } from "next/server";
import { runBookAnalysis } from "@/lib/agents/book-agent";
import { Book } from "@/types/book";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book } = body as { book: Book };

    if (!book || !book.id) {
      return NextResponse.json({ error: "Book data is required" }, { status: 400 });
    }

    const result = await runBookAnalysis(book);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      analysis: result.analysis,
      book,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze book" }, { status: 500 });
  }
}
