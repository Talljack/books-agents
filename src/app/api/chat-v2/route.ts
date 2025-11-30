import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { runBookAgent, type InferredPreferences } from "@/lib/agents";
import { Book } from "@/types/book";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  preferences: Record<string, string>;
  missingFields: string[];
  inferredPreferences?: InferredPreferences;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, state, adjustedPreferences } = (await request.json()) as {
      message: string;
      history: ChatMessage[];
      state?: ChatState;
      adjustedPreferences?: Partial<InferredPreferences>; // 用户调整的偏好
    };

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    console.log("[API] Received message:", message);
    console.log("[API] History length:", history?.length || 0);
    console.log("[API] Adjusted preferences:", adjustedPreferences);

    // 将历史消息转换为 LangChain 消息格式
    const previousMessages: BaseMessage[] = (history || []).map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    );

    // 如果有调整的偏好，需要构建新的搜索查询
    let effectiveMessage = message;
    if (adjustedPreferences) {
      // 重新构建搜索请求
      const level = adjustedPreferences.level || "beginner";
      const levelLabel = level === "beginner" ? "入门" : level === "intermediate" ? "进阶" : "高级";
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
    console.log("[API] Inferred preferences:", result.inferredPreferences);

    // 提取最后一条 AI 消息
    const aiMessages = result.messages.filter(
      (m) => m._getType() === "ai" && typeof m.content === "string" && m.content.length > 0
    );

    const lastAiMessage = aiMessages[aiMessages.length - 1];
    const responseMessage =
      typeof lastAiMessage?.content === "string"
        ? lastAiMessage.content
        : "抱歉，我遇到了一些问题。请再试一次。";

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
  } catch (error) {
    console.error("[API] Chat error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Chat failed",
        message: "抱歉，服务暂时出现问题。请稍后再试。",
      },
      { status: 500 }
    );
  }
}
