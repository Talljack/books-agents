import { NextRequest, NextResponse } from "next/server";
import { searchBooksTool } from "@/lib/agents/tools";
import { buildSearchQuery, createLLM, type InferredPreferences } from "@/lib/agents";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * 确认搜索 API - 使用用户确认/调整后的偏好执行搜索
 */
export async function POST(request: NextRequest) {
  try {
    const { message, preferences } = (await request.json()) as {
      message: string;
      preferences: InferredPreferences;
    };

    if (!preferences) {
      return NextResponse.json(
        { error: "Preferences are required" },
        { status: 400 }
      );
    }

    console.log("[ConfirmSearch] Original message:", message);
    console.log("[ConfirmSearch] Confirmed preferences:", preferences);

    // 构建搜索查询
    const searchQuery = buildSearchQuery(preferences);
    console.log("[ConfirmSearch] Search query:", searchQuery);

    // 直接调用搜索工具，目标返回 20 条结果
    const books = await searchBooksTool.invoke({
      query: searchQuery,
      maxResults: 20,
      language: preferences.language,
    });

    console.log("[ConfirmSearch] Books found:", books.length);

    // 确定响应语言
    const isEnglish = preferences.language === "en";

    // 生成响应消息
    let responseMessage = "";
    if (books.length > 0) {
      // 使用 LLM 生成推荐说明
      try {
        const llm = createLLM();
        const booksInfo = books
          .slice(0, 5)
          .map((b, idx) => `${idx + 1}. "${b.title}" - ${b.authors.join(", ")}`)
          .join("\n");

        const prompt = isEnglish
          ? `Based on the following information, generate a brief recommendation.

Topic: ${preferences.topic}
${!preferences.isFiction ? `Level: ${preferences.levelLabel}` : ""}
Language: ${preferences.languageLabel}

Books found:
${booksInfo}

Please explain in 1-2 sentences why these books are suitable for the user. Keep it concise and friendly, don't list the books again.`
          : `根据以下信息，生成简短的推荐说明。

主题: ${preferences.topic}
${!preferences.isFiction ? `难度: ${preferences.levelLabel}` : ""}
语言: ${preferences.languageLabel}

找到的书籍:
${booksInfo}

请用1-2句话说明为什么这些书适合用户。保持简洁友好，不要重复列出书籍。`;

        const systemPrompt = isEnglish
          ? "You are a professional and friendly book recommendation assistant. Provide the recommendation directly, don't ask questions. Reply in English."
          : "你是一个专业友好的图书推荐助手。直接给出推荐说明，不要问问题。";

        const response = await llm.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(prompt),
        ]);

        responseMessage = typeof response.content === "string" ? response.content : "";
      } catch {
        responseMessage = isEnglish
          ? (preferences.isFiction
              ? `Found ${books.length} ${preferences.topic} books for you`
              : `Found ${books.length} ${preferences.levelLabel} level ${preferences.topic} books for you`)
          : (preferences.isFiction
              ? `为您找到了 ${books.length} 本${preferences.topic}相关书籍`
              : `为您找到了 ${books.length} 本${preferences.levelLabel}级别的${preferences.topic}书籍`);
      }
    } else {
      responseMessage = isEnglish
        ? "Sorry, no books found matching your criteria. Try adjusting your search terms."
        : "抱歉，没有找到符合条件的书籍。您可以尝试调整搜索条件。";
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      books,
      searchQuery,
      preferences,
    });
  } catch (error) {
    console.error("[ConfirmSearch] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Search failed",
        message: "抱歉，搜索时出现问题。请稍后再试。",
      },
      { status: 500 }
    );
  }
}

