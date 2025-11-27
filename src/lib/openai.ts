import OpenAI from "openai";

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

// Default model based on provider
const DEFAULT_MODEL = isOpenRouter
  ? process.env.OPENROUTER_MODEL || "google/gemma-2-9b-it:free"
  : "gpt-4o";

export default openai;

export async function streamCompletion(
  prompt: string,
  systemPrompt?: string
): Promise<ReadableStream> {
  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      { role: "user", content: prompt },
    ],
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });
}

export async function generateBookAnalysis(bookInfo: string): Promise<string> {
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

  // Some free models don't support json_object response format
  const supportsJsonFormat = !isOpenRouter || DEFAULT_MODEL.includes("gpt");

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Please analyze this book and respond with valid JSON only:\n\n${bookInfo}`,
      },
    ],
    ...(supportsJsonFormat ? { response_format: { type: "json_object" } } : {}),
  });

  return response.choices[0].message.content || "{}";
}
