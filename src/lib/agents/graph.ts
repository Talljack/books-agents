import { StateGraph, END, START } from "@langchain/langgraph";
import { BookAgentState, BookAgentStateType } from "./types";
import {
  conversationNode,
  toolNode,
  responseNode,
  routeAfterConversation,
  routeAfterTools,
} from "./nodes";

/**
 * 创建 Book Agent 图
 *
 * 状态流转:
 * START → conversation → (tools → respond →) END
 *                    ↘ END (等待用户输入)
 */
export function createBookAgentGraph() {
  const workflow = new StateGraph(BookAgentState)
    // 添加节点
    .addNode("conversation", conversationNode)
    .addNode("tools", toolNode)
    .addNode("respond", responseNode)

    // 起始边
    .addEdge(START, "conversation")

    // 对话节点后的条件路由
    .addConditionalEdges("conversation", routeAfterConversation, {
      tools: "tools",
      conversation: "conversation", // 重试
      __end__: END,
    })

    // 工具��点后的条件路由
    .addConditionalEdges("tools", routeAfterTools, {
      respond: "respond",
      conversation: "conversation", // 重试
    })

    // 响应节点后结束
    .addEdge("respond", END);

  return workflow.compile();
}

// 导出编译后的图
export const bookAgent = createBookAgentGraph();

/**
 * 运行 Agent 的便捷函数
 */
export async function runBookAgent(
  userMessage: string,
  previousState?: Partial<BookAgentStateType>
): Promise<BookAgentStateType> {
  const { HumanMessage } = await import("@langchain/core/messages");

  const initialState: Partial<BookAgentStateType> = {
    messages: previousState?.messages || [],
    preferences: previousState?.preferences || {},
    books: [],
    needsMoreInfo: true,
    missingFields: previousState?.missingFields || ["topic", "level"],
    phase: "gathering",
    retryCount: 0,
  };

  // 添加用户消息
  initialState.messages = [...(initialState.messages || []), new HumanMessage(userMessage)];

  // 运行图
  const result = await bookAgent.invoke(initialState as BookAgentStateType);

  return result;
}

// 导出类型
export type { BookAgentStateType };
