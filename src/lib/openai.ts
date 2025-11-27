import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

export async function streamCompletion(
  prompt: string,
  systemPrompt?: string
): Promise<ReadableStream> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
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

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please analyze this book:\n\n${bookInfo}` },
    ],
    response_format: { type: "json_object" },
  });

  return response.choices[0].message.content || "{}";
}
