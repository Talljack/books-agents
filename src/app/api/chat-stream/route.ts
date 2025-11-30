import { NextRequest } from "next/server";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { bookAgent, BookAgentStateType } from "@/lib/agents";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  preferences: Record<string, string>;
  missingFields: string[];
}

/**
 * 流式 Chat API
 * 支持 Server-Sent Events (SSE) 实时推送
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const { message, history, state } = (await request.json()) as {
      message: string;
      history: ChatMessage[];
      state?: ChatState;
    };

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // 发送开始事件
          sendEvent("start", { status: "processing" });

          // 将历史消息转换为 LangChain 消息格式
          const previousMessages: BaseMessage[] = (history || []).map((m) =>
            m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
          );

          // 准备初始状态
          const initialState: Partial<BookAgentStateType> = {
            messages: [...previousMessages, new HumanMessage(message)],
            preferences: state?.preferences || {},
            missingFields: state?.missingFields || ["topic", "level"],
            books: [],
            needsMoreInfo: true,
            phase: "gathering",
            retryCount: 0,
          };

          // 使用流式执行
          let finalState: BookAgentStateType | null = null;

          // 流式执行图
          const streamResult = await bookAgent.stream(initialState as BookAgentStateType, {
            streamMode: "updates",
          });

          for await (const update of streamResult) {
            console.log("[Stream] Update:", Object.keys(update));

            // 发送节点更新事件
            for (const [nodeName, nodeState] of Object.entries(update)) {
              sendEvent("node", { node: nodeName, state: { phase: (nodeState as BookAgentStateType).phase } });

              // 如果有新的 AI 消息，发送消息块
              const messages = (nodeState as BookAgentStateType).messages || [];
              for (const msg of messages) {
                if (msg._getType() === "ai" && typeof msg.content === "string" && msg.content.length > 0) {
                  sendEvent("message", { content: msg.content });
                }
              }

              // 更新最终状态
              finalState = nodeState as BookAgentStateType;
            }
          }

          // 发送完成事件
          if (finalState) {
            sendEvent("complete", {
              message: finalState.messages
                .filter((m) => m._getType() === "ai")
                .map((m) => m.content)
                .filter((c) => typeof c === "string" && c.length > 0)
                .pop() || "处理完成",
              books: finalState.books?.length > 0 ? finalState.books : undefined,
              state: {
                preferences: finalState.preferences,
                missingFields: finalState.missingFields,
                phase: finalState.phase,
              },
            });
          }
        } catch (error) {
          console.error("[Stream] Error:", error);
          sendEvent("error", {
            message: error instanceof Error ? error.message : "处��失败",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[API] Stream error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Stream failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
