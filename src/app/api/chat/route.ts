import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { runBookAgent, type InferredPreferences } from "@/lib/agents";
import { searchGoogleBooks } from "@/lib/api/google-books";
import { searchOpenLibrary } from "@/lib/api/open-library";
import { searchDoubanBooks, isChineseQuery } from "@/lib/api/douban";
import { Book } from "@/types/book";
import { createLLM } from "@/lib/llm/factory";

// 检测语言
function detectLanguage(text: string): "zh" | "en" {
  return /[\u4e00-\u9fff]/.test(text) ? "zh" : "en";
}

// 多语言系统提示词
const SYSTEM_PROMPTS = {
  zh: `你是一个专业的图书推荐助手。帮助用户找到最适合的书籍。

重要规则：
1. 当用户询问书籍时，先问1-2个澄清问题以更好地了解他们的偏好。询问：
   - 具体感兴趣的主题或领域
   - 经验水平（入门/进阶/高级）
   - 偏好实战类还是理论类书籍
   - 语言偏好

2. 收集足够信息后（通常1-2轮对话），在回复中包含 "[SEARCH: <优化的搜索词>]" 来触发搜索。

3. 保持回复简洁友好。

4. 如果用户的请求已经很具体，可以直接搜索。`,

  en: `You are a professional book recommendation assistant. Help users find the perfect books.

IMPORTANT RULES:
1. When a user asks for books, ask 1-2 clarifying questions first to understand their preferences:
   - Specific topics or themes they're interested in
   - Experience level (beginner/intermediate/advanced)
   - Whether they prefer practical or theoretical books
   - Language preference

2. After gathering enough information (usually 1-2 exchanges), include "[SEARCH: <optimized search query>]" in your response.

3. Keep responses concise and friendly.

4. If the user's request is already specific, you can search immediately.`,
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  preferences: Record<string, string>;
  missingFields: string[];
  inferredPreferences?: InferredPreferences;
}

/**
 * 统一的 Chat API
 * 支持两种模式：
 * - mode: "basic" - 简单对话模式（默认）
 * - mode: "agent" - LangGraph Agent 模式
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message, 
      history = [], 
      mode = "basic",
      state,
      adjustedPreferences,
    } = body as {
      message: string;
      history: ChatMessage[];
      mode?: "basic" | "agent";
      state?: ChatState;
      adjustedPreferences?: Partial<InferredPreferences>;
    };

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 根据模式选择处理方式
    if (mode === "agent") {
      return handleAgentMode(message, history, state, adjustedPreferences);
    } else {
      return handleBasicMode(message, history);
    }
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Chat failed",
        message: "Sorry, something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * 基础对话模式 - 简单的问答 + 搜索
 * 使用配置的 LLM（支持 Ollama 等）
 */
async function handleBasicMode(message: string, history: ChatMessage[]) {
  const lang = detectLanguage(message);
  
  try {
    // 使用 LLM 工厂创建模型
    const llm = createLLM();
    
    // Build conversation history
    const messages: BaseMessage[] = [
      new SystemMessage(SYSTEM_PROMPTS[lang]),
      ...history.map((m) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
      new HumanMessage(message),
    ];

    // Get AI response
    const response = await llm.invoke(messages);
    const aiResponse = typeof response.content === "string" ? response.content : "";

    // Check if the response contains a search command
    const searchMatch = aiResponse.match(/\[SEARCH:\s*([^\]]+)\]/i);
    let books: Book[] = [];
    let cleanResponse = aiResponse;

    if (searchMatch) {
      const searchQuery = searchMatch[1].trim();
      cleanResponse = aiResponse.replace(/\[SEARCH:[^\]]+\]/gi, "").trim();

      // Add a message about searching
      const searchingMsg = lang === "zh" ? "正在搜索书籍..." : "Searching for books...";
      if (!cleanResponse.toLowerCase().includes("searching") && !cleanResponse.includes("搜索")) {
        cleanResponse += `\n\n${searchingMsg}`;
      }

      // Perform the search - 根据语言选择搜索源
      try {
        const isChinese = isChineseQuery(searchQuery);
        
        let allBooks: Book[] = [];
        
        if (isChinese) {
          // 中文搜索：优先豆瓣
          const [doubanResults, googleResults] = await Promise.all([
            searchDoubanBooks(searchQuery, 10).catch(() => ({ books: [] })),
            searchGoogleBooks(searchQuery, undefined, 6).catch(() => ({ books: [], totalItems: 0, query: searchQuery })),
          ]);
          allBooks = [...doubanResults.books, ...googleResults.books];
        } else {
          // 英文搜索：Google + Open Library
          const [googleResults, openLibraryResults] = await Promise.all([
            searchGoogleBooks(searchQuery, undefined, 8).catch(() => ({ books: [], totalItems: 0, query: searchQuery })),
            searchOpenLibrary(searchQuery, 6).catch(() => ({ books: [], totalItems: 0, query: searchQuery })),
          ]);
          allBooks = [...googleResults.books, ...openLibraryResults.books];
        }

        // Deduplicate
        const seen = new Set<string>();
        books = allBooks
          .filter((book) => {
            const key = `${book.title.toLowerCase()}-${book.authors.join(",").toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 12);

        if (books.length > 0) {
          const foundMsg = lang === "zh" 
            ? `为您找到了 ${books.length} 本书籍：`
            : `Here are ${books.length} books I found for you:`;
          cleanResponse = cleanResponse.replace(
            lang === "zh" ? /正在搜索书籍\.\.\./ : /Searching for books\.\.\./,
            foundMsg
          );
        } else {
          const notFoundMsg = lang === "zh"
            ? "抱歉，没有找到匹配的书籍。请尝试其他关键词。"
            : "Unfortunately, I couldn't find any books matching those criteria. Could you try different keywords?";
          cleanResponse += ` ${notFoundMsg}`;
        }
      } catch (searchError) {
        console.error("Search error:", searchError);
        const errorMsg = lang === "zh"
          ? "搜索时出现问题，请重试。"
          : "Sorry, I had trouble searching for books. Please try again.";
        cleanResponse += ` ${errorMsg}`;
      }
    }

    return NextResponse.json({
      message: cleanResponse,
      books: books.length > 0 ? books : undefined,
    });
  } catch (error) {
    console.error("[Basic Mode] LLM Error:", error);
    throw error;
  }
}

/**
 * Agent 模式 - 使用 LangGraph Agent
 */
async function handleAgentMode(
  message: string,
  history: ChatMessage[],
  state?: ChatState,
  adjustedPreferences?: Partial<InferredPreferences>
) {
  const lang = detectLanguage(message);
  
  console.log("[API] Agent mode - message:", message);
  console.log("[API] History length:", history?.length || 0);
  console.log("[API] Adjusted preferences:", adjustedPreferences);

  // 将历史消息转换为 LangChain 消息格式
  const previousMessages: BaseMessage[] = (history || []).map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  // 如果有调整的偏好，需要构建新的搜索查询
  let effectiveMessage = message;
  if (adjustedPreferences) {
    const level = adjustedPreferences.level || "beginner";
    const levelLabel = lang === "zh"
      ? (level === "beginner" ? "入门" : level === "intermediate" ? "进阶" : "高级")
      : level;
    effectiveMessage = `${adjustedPreferences.topic || message} ${levelLabel}`;
    console.log("[API] Effective message with adjustments:", effectiveMessage);
  }

  // 运行 LangGraph Agent
  const result = await runBookAgent(effectiveMessage, {
    messages: previousMessages,
    preferences: state?.preferences || {},
    missingFields: state?.missingFields || ["topic", "level"],
  });

  console.log("[API] Agent result phase:", result.phase);
  console.log("[API] Books found:", result.books?.length || 0);

  // 提取最后一条 AI 消息
  const aiMessages = result.messages.filter(
    (m) => m._getType() === "ai" && typeof m.content === "string" && m.content.length > 0
  );

  const lastAiMessage = aiMessages[aiMessages.length - 1];
  const defaultMsg = lang === "zh" 
    ? "抱歉，我遇到了一些问题。请再试一次。"
    : "Sorry, I encountered an issue. Please try again.";
  const responseMessage =
    typeof lastAiMessage?.content === "string"
      ? lastAiMessage.content
      : defaultMsg;

  return NextResponse.json({
    message: responseMessage,
    books: result.books?.length > 0 ? result.books : undefined,
    inferredPreferences: result.inferredPreferences,
    state: {
      preferences: result.preferences,
      missingFields: result.missingFields,
      phase: result.phase,
      inferredPreferences: result.inferredPreferences,
    },
  });
}
