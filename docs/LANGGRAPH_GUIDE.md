# LangGraph 完整技术指南

## 目录

1. [概述](#概述)
2. [核心概念](#核心概念)
3. [架构设计](#架构设计)
4. [状态图详解](#状态图详解)
5. [实现步骤](#实现步骤)
6. [代码示例](#代码示例)
7. [最佳实践](#最佳实践)
8. [与当前实现对比](#与当前实现对比)

---

## 概述

### 什么是 LangGraph？

LangGraph 是 LangChain 团队开发的一个库，用于构建**有状态的、多角色的 AI 应用**。它基于**图Graph**的概念，让你可以：

- 定义复杂的工作流程
- 管理对话状态
- 实现多 Agent 协作
- 支持循环和条件分支

### 为什么需要 LangGraph？

```
传统 LLM 调用:  用户 → LLM → 响应 (单次，无状态)

LangGraph:    用户 → [状态机] → 多个节点协作 → 响应 (多轮，有状态)
```

---

## 核心概念

### 1. State（状态）

状态是贯穿整个工作流的数据容器。

```typescript
// 定义状态结构
interface BookAgentState {
  // 用户输入
  userMessage: string;

  // 对话历史
  messages: Message[];

  // 收集的用户偏好
  preferences: {
    topic?: string; // 主题
    level?: string; // 难度级别
    language?: string; // 语言偏好
    bookType?: string; // 书籍类型
  };

  // 搜索结果
  books: Book[];

  // 当前阶段
  currentPhase: "gathering" | "searching" | "presenting";

  // 是否需要更多信息
  needsMoreInfo: boolean;
}
```

### 2. Node（节点）

节点是执行特定任务的函数。

```typescript
// 节点示例：分析用户意图
async function analyzeIntent(state: BookAgentState): Promise<Partial<BookAgentState>> {
  const response = await llm.invoke([
    { role: "system", content: INTENT_ANALYSIS_PROMPT },
    { role: "user", content: state.userMessage },
  ]);

  return {
    preferences: parsePreferences(response),
    needsMoreInfo: checkIfNeedsMoreInfo(response),
  };
}
```

### 3. Edge（边）

边定义节点之间的连接和流转条件。

```typescript
// 条件边：根据状态决定下一步
function routeAfterAnalysis(state: BookAgentState): string {
  if (state.needsMoreInfo) {
    return "ask_clarifying_question"; // 需要更多信息
  }
  return "search_books"; // 信息充足，开始搜索
}
```

### 4. Graph（图）

图是节点和边的组合，定义完整的工作流。

```typescript
const graph = new StateGraph<BookAgentState>({
  channels: bookAgentStateChannels,
})
  .addNode("analyze_intent", analyzeIntent)
  .addNode("ask_question", askClarifyingQuestion)
  .addNode("search_books", searchBooks)
  .addNode("present_results", presentResults)
  .addEdge(START, "analyze_intent")
  .addConditionalEdges("analyze_intent", routeAfterAnalysis)
  .addEdge("ask_question", END)
  .addEdge("search_books", "present_results")
  .addEdge("present_results", END);
```

---

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        BookFinder AI                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Frontend  │    │   API       │    │  LangGraph  │         │
│  │   (Next.js) │◄──►│   Routes    │◄──►│   Agent     │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
│                                                │                 │
│                                    ┌───────────┴───────────┐    │
│                                    │                       │    │
│                              ┌─────▼─────┐          ┌──────▼───┐│
│                              │   LLM     │          │  Tools   ││
│                              │ (OpenAI/  │          │ (Search) ││
│                              │ OpenRouter)│          └──────────┘│
│                              └───────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流图

```
用户消息
    │
    ▼
┌───────────────┐
│  API Route    │
│  /api/chat    │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  LangGraph    │
│  Agent        │
└───────┬───────┘
        │
        ▼
┌───────────────────────────────────────────────────┐
│                   State Machine                    │
│                                                    │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│   │ Analyze  │───►│ Decide   │───►│ Execute  │   │
│   │ Intent   │    │ Action   │    │ Action   │   │
│   └──────────┘    └────┬─────┘    └──────────┘   │
│                        │                          │
│                        ▼                          │
│              ┌─────────────────┐                  │
│              │ Need more info? │                  │
│              └────────┬────────┘                  │
│                       │                           │
│          ┌────────────┴────────────┐             │
│          │                         │             │
│          ▼                         ▼             │
│   ┌──────────┐              ┌──────────┐        │
│   │   Ask    │              │  Search  │        │
│   │ Question │              │  Books   │        │
│   └──────────┘              └──────────┘        │
│                                                  │
└──────────────────────────────────────────────────┘
        │
        ▼
    响应给用户
```

---

## 状态图详解

### 完整状态转换图

```
                              ┌─────────────────┐
                              │     START       │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  analyze_intent │
                              │                 │
                              │ - 分析用户意图   │
                              │ - 提取偏好信息   │
                              │ - 判断信息完整性 │
                              └────────┬────────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                 needsMoreInfo=true        needsMoreInfo=false
                          │                         │
                          ▼                         ▼
                 ┌─────────────────┐       ┌─────────────────┐
                 │  ask_question   │       │  search_books   │
                 │                 │       │                 │
                 │ - 生成澄清问题   │       │ - 调用搜索API   │
                 │ - 引导用户提供   │       │ - 合并结果      │
                 │   更多信息      │       │ - 去重排序      │
                 └────────┬────────┘       └────────┬────────┘
                          │                         │
                          │                         ▼
                          │                ┌─────────────────┐
                          │                │ present_results │
                          │                │                 │
                          │                │ - 格式化结果     │
                          │                │ - 生成推荐理由   │
                          │                └────────┬────────┘
                          │                         │
                          ▼                         ▼
                 ┌─────────────────┐       ┌─────────────────┐
                 │      END        │       │      END        │
                 │  (等待用户回复)  │       │  (返回书籍)     │
                 └─────────────────┘       └─────────────────┘
```

### 多轮对话状态流转

```
第一轮: 用户 "我想找AI相关的书"
        │
        ▼
    [analyze_intent] ──► needsMoreInfo=true
        │
        ▼
    [ask_question] ──► "你对AI的哪个方向感兴趣？"
        │
        ▼
      [END] ◄─── 等待用户回复

第二轮: 用户 "机器学习方向"
        │
        ▼
    [analyze_intent] ──► needsMoreInfo=true (还需要级别信息)
        │
        ▼
    [ask_question] ──► "你的技术背景如何？"
        │
        ▼
      [END] ◄─── 等待用户回复

第三轮: 用户 "中级开发者"
        │
        ▼
    [analyze_intent] ──► needsMoreInfo=false (信息充足)
        │
        ▼
    [search_books] ──► 搜索 "机器学习 中级 Python"
        │
        ▼
    [present_results] ──► 返回书籍列表
        │
        ▼
      [END] ◄─── 完成
```

---

## 实现步骤

### 步骤 1: 安装依赖

```bash
pnpm add @langchain/langgraph @langchain/core @langchain/openai
```

### 步骤 2: 定义状态类型

```typescript
// src/lib/agents/types.ts

import { BaseMessage } from "@langchain/core/messages";

export interface UserPreferences {
  topic?: string; // 主题/领域
  level?: string; // 难度级别: beginner | intermediate | advanced
  language?: string; // 语言偏好
  bookType?: string; // 书籍类型: practical | theoretical
  publicationYear?: string; // 出版年份偏好
}

export interface BookAgentState {
  // 输入
  userMessage: string;

  // 对话历史
  messages: BaseMessage[];

  // 用户偏好（逐步收集）
  preferences: UserPreferences;

  // 搜索结果
  searchQuery?: string;
  books: Book[];

  // 流程控制
  currentPhase: "gathering" | "searching" | "presenting" | "complete";
  needsMoreInfo: boolean;
  missingInfo: string[];

  // 错误处理
  error?: string;
  retryCount: number;
}

// 初始状态
export const initialState: BookAgentState = {
  userMessage: "",
  messages: [],
  preferences: {},
  books: [],
  currentPhase: "gathering",
  needsMoreInfo: true,
  missingInfo: ["topic", "level"],
  retryCount: 0,
};
```

### 步骤 3: 创建节点函数

```typescript
// src/lib/agents/nodes.ts

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { BookAgentState, UserPreferences } from "./types";

const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
});

// 节点 1: 分析用户意图
export async function analyzeIntent(state: BookAgentState): Promise<Partial<BookAgentState>> {
  const systemPrompt = `你是一个图书推荐助手的意图分析模块。
分析用户的消息，提取以下信息：
- topic: 用户感兴趣的主题/领域
- level: 用户的技术水平 (beginner/intermediate/advanced)
- language: 语言偏好 (en/zh)
- bookType: 书籍类型偏好 (practical/theoretical)

返回JSON格式：
{
  "preferences": { ... },
  "missingInfo": ["缺少的信息字段"],
  "needsMoreInfo": true/false
}`;

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages,
    new HumanMessage(state.userMessage),
  ]);

  const result = JSON.parse(response.content as string);

  return {
    preferences: { ...state.preferences, ...result.preferences },
    needsMoreInfo: result.needsMoreInfo,
    missingInfo: result.missingInfo,
    messages: [...state.messages, new HumanMessage(state.userMessage)],
  };
}

// 节点 2: 生成澄清问题
export async function askClarifyingQuestion(
  state: BookAgentState
): Promise<Partial<BookAgentState>> {
  const missingInfoPrompts: Record<string, string> = {
    topic: "你对哪个具体领域/主题感兴趣？比如机器学习、Web开发、数据科学等",
    level: "你的技术背景如何？初学者、有一定经验、还是高级开发者？",
    language: "你希望阅读中文还是英文书籍？",
    bookType: "你更喜欢实践性强的书籍，还是理论深入的书籍？",
  };

  const systemPrompt = `你是一个友好的图书推荐助手。
用户正在寻找书籍，但我们还需要了解更多信息。
根据缺失的信息，用自然、友好的方式提问。

缺失信息: ${state.missingInfo.join(", ")}
已知偏好: ${JSON.stringify(state.preferences)}

生成1-2个简短的问题来收集缺失信息。保持对话自然。`;

  const response = await llm.invoke([new SystemMessage(systemPrompt), ...state.messages]);

  const aiMessage = new AIMessage(response.content as string);

  return {
    messages: [...state.messages, aiMessage],
    currentPhase: "gathering",
  };
}

// 节点 3: 搜索书籍
export async function searchBooks(state: BookAgentState): Promise<Partial<BookAgentState>> {
  // 构建搜索查询
  const { topic, level, language } = state.preferences;
  const searchQuery = [topic, level, language === "zh" ? "中文" : ""].filter(Boolean).join(" ");

  try {
    // 并行搜索多个数据源
    const [googleResults, openLibraryResults] = await Promise.all([
      searchGoogleBooks(searchQuery, undefined, 6),
      searchOpenLibrary(searchQuery, 6),
    ]);

    // 合并去重
    const allBooks = [...googleResults.books, ...openLibraryResults.books];
    const seen = new Set<string>();
    const uniqueBooks = allBooks.filter((book) => {
      const key = `${book.title.toLowerCase()}-${book.authors.join(",").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      searchQuery,
      books: uniqueBooks.slice(0, 8),
      currentPhase: "presenting",
    };
  } catch (error) {
    return {
      error: `搜索失败: ${error}`,
      retryCount: state.retryCount + 1,
    };
  }
}

// 节点 4: 展示结果
export async function presentResults(state: BookAgentState): Promise<Partial<BookAgentState>> {
  if (state.books.length === 0) {
    const message = new AIMessage("抱歉，没有找到符合条件的书籍。要不要换个关键词试试？");
    return {
      messages: [...state.messages, message],
      currentPhase: "complete",
    };
  }

  const systemPrompt = `你是一个图书推荐助手。
根据用户的偏好和搜索到的书籍，生成一段简短的推荐说明。

用户偏好: ${JSON.stringify(state.preferences)}
找到的书籍数量: ${state.books.length}

用1-2句话介绍为什么推荐这些书。`;

  const response = await llm.invoke([new SystemMessage(systemPrompt)]);

  const message = new AIMessage(response.content as string);

  return {
    messages: [...state.messages, message],
    currentPhase: "complete",
  };
}
```

### 步骤 4: 定义条件路由

```typescript
// src/lib/agents/router.ts

import { BookAgentState } from "./types";

// 分析后的路由决策
export function routeAfterAnalysis(state: BookAgentState): string {
  // 如果有错误且重试次数未超限
  if (state.error && state.retryCount < 3) {
    return "analyze_intent"; // 重试
  }

  // 如果需要更多信息
  if (state.needsMoreInfo && state.missingInfo.length > 0) {
    return "ask_question";
  }

  // 信息充足，开始搜索
  return "search_books";
}

// 搜索后的路由决策
export function routeAfterSearch(state: BookAgentState): string {
  // 如果搜索失败且可重试
  if (state.error && state.retryCount < 3) {
    return "search_books"; // 重试搜索
  }

  return "present_results";
}
```

### 步骤 5: 构建图

```typescript
// src/lib/agents/graph.ts

import { StateGraph, END, START } from "@langchain/langgraph";
import { BookAgentState, initialState } from "./types";
import { analyzeIntent, askClarifyingQuestion, searchBooks, presentResults } from "./nodes";
import { routeAfterAnalysis, routeAfterSearch } from "./router";

// 定义状态通道
const bookAgentChannels = {
  userMessage: {
    value: (old: string, next: string) => next,
    default: () => "",
  },
  messages: {
    value: (old: any[], next: any[]) => next,
    default: () => [],
  },
  preferences: {
    value: (old: any, next: any) => ({ ...old, ...next }),
    default: () => ({}),
  },
  books: {
    value: (old: any[], next: any[]) => next,
    default: () => [],
  },
  currentPhase: {
    value: (old: string, next: string) => next,
    default: () => "gathering",
  },
  needsMoreInfo: {
    value: (old: boolean, next: boolean) => next,
    default: () => true,
  },
  missingInfo: {
    value: (old: string[], next: string[]) => next,
    default: () => ["topic", "level"],
  },
  searchQuery: {
    value: (old: string | undefined, next: string | undefined) => next,
    default: () => undefined,
  },
  error: {
    value: (old: string | undefined, next: string | undefined) => next,
    default: () => undefined,
  },
  retryCount: {
    value: (old: number, next: number) => next,
    default: () => 0,
  },
};

// 构建状态图
export function createBookAgentGraph() {
  const graph = new StateGraph<BookAgentState>({
    channels: bookAgentChannels,
  });

  // 添加节点
  graph
    .addNode("analyze_intent", analyzeIntent)
    .addNode("ask_question", askClarifyingQuestion)
    .addNode("search_books", searchBooks)
    .addNode("present_results", presentResults);

  // 添加边
  graph
    // 起点 → 分析意图
    .addEdge(START, "analyze_intent")

    // 分析意图后的条件路由
    .addConditionalEdges("analyze_intent", routeAfterAnalysis, {
      ask_question: "ask_question",
      search_books: "search_books",
      analyze_intent: "analyze_intent", // 重试
    })

    // 提问后结束（等待用户回复）
    .addEdge("ask_question", END)

    // 搜索后的条件路由
    .addConditionalEdges("search_books", routeAfterSearch, {
      present_results: "present_results",
      search_books: "search_books", // 重试
    })

    // 展示结果后结束
    .addEdge("present_results", END);

  return graph.compile();
}

// 导出编译后的图
export const bookAgent = createBookAgentGraph();
```

### 步骤 6: 创建 API 路由

```typescript
// src/app/api/chat/route.ts (使用 LangGraph 版本)

import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { bookAgent } from "@/lib/agents/graph";
import { BookAgentState } from "@/lib/agents/types";

export async function POST(request: NextRequest) {
  try {
    const { message, history, previousState } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 恢复或初始化状态
    const state: Partial<BookAgentState> = previousState || {
      messages:
        history?.map((m: any) =>
          m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
        ) || [],
      preferences: {},
      books: [],
      needsMoreInfo: true,
      missingInfo: ["topic", "level"],
      retryCount: 0,
    };

    // 设置新的用户消息
    state.userMessage = message;

    // 运行图
    const result = await bookAgent.invoke(state);

    // 提取最后一条 AI 消息
    const lastMessage = result.messages[result.messages.length - 1];

    return NextResponse.json({
      message: lastMessage.content,
      books: result.books.length > 0 ? result.books : undefined,
      // 返回状态以便下次继续
      state: {
        preferences: result.preferences,
        currentPhase: result.currentPhase,
        needsMoreInfo: result.needsMoreInfo,
        missingInfo: result.missingInfo,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
```

---

## 代码示例

### 完整的 Agent 实现

```typescript
// src/lib/agents/book-agent.ts

import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchGoogleBooks, searchOpenLibrary } from "@/lib/api";

// ============ 1. 定义工具 ============

const searchBooksTool = tool(
  async ({ query, maxResults = 6 }) => {
    const [google, openLib] = await Promise.all([
      searchGoogleBooks(query, undefined, maxResults),
      searchOpenLibrary(query, maxResults),
    ]);

    const allBooks = [...google.books, ...openLib.books];
    // 去重
    const seen = new Set();
    return allBooks
      .filter((book) => {
        const key = `${book.title}-${book.authors.join(",")}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, maxResults);
  },
  {
    name: "search_books",
    description: "搜索书籍数据库",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
      maxResults: z.number().optional().describe("最大结果数"),
    }),
  }
);

// ============ 2. 定义状态 ============

const BookAgentAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (old, next) => [...old, ...next],
    default: () => [],
  }),
  preferences: Annotation<Record<string, string>>({
    reducer: (old, next) => ({ ...old, ...next }),
    default: () => ({}),
  }),
  books: Annotation<any[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  needsMoreInfo: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => true,
  }),
});

type AgentState = typeof BookAgentAnnotation.State;

// ============ 3. 创建 LLM ============

const llm = new ChatOpenAI({
  modelName: process.env.OPENROUTER_MODEL || "gpt-4o",
  configuration: {
    baseURL: process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : undefined,
  },
}).bindTools([searchBooksTool]);

// ============ 4. 定义节点 ============

async function conversationNode(state: AgentState): Promise<Partial<AgentState>> {
  const systemPrompt = `你是一个专业的图书推荐助手。

当前已收集的用户偏好: ${JSON.stringify(state.preferences)}

规则:
1. 如果用户刚开始对话，先询问他们想找什么类型的书
2. 逐步收集: 主题、技术水平、语言偏好
3. 当收集到足够信息后，使用 search_books 工具搜索
4. 每次只问1-2个问题，保持对话自然

如果信息充足，直接调用搜索工具。`;

  const response = await llm.invoke([new SystemMessage(systemPrompt), ...state.messages]);

  // 检查是否有工具调用
  if (response.tool_calls && response.tool_calls.length > 0) {
    return {
      messages: [response],
      needsMoreInfo: false,
    };
  }

  return {
    messages: [response],
    needsMoreInfo: true,
  };
}

async function toolNode(state: AgentState): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1];

  if (!lastMessage.tool_calls?.length) {
    return {};
  }

  const toolCall = lastMessage.tool_calls[0];

  if (toolCall.name === "search_books") {
    const books = await searchBooksTool.invoke(toolCall.args);
    return { books };
  }

  return {};
}

async function responseNode(state: AgentState): Promise<Partial<AgentState>> {
  if (state.books.length === 0) {
    return {
      messages: [new AIMessage("抱歉，没有找到相关书籍。换个关键词试试？")],
    };
  }

  const response = await llm.invoke([
    new SystemMessage(`根据搜索到的 ${state.books.length} 本书，
      生成简短的推荐说明。用户偏好: ${JSON.stringify(state.preferences)}`),
    new HumanMessage("请推荐书籍"),
  ]);

  return {
    messages: [response],
  };
}

// ============ 5. 定义路由 ============

function shouldContinue(state: AgentState): string {
  const lastMessage = state.messages[state.messages.length - 1];

  // 如果有工具调用，执行工具
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  // 否则结束
  return "end";
}

function afterTools(state: AgentState): string {
  // 工具执行后，生成响应
  return "respond";
}

// ============ 6. 构建图 ============

export function createBookAgent() {
  const workflow = new StateGraph(BookAgentAnnotation)
    .addNode("conversation", conversationNode)
    .addNode("tools", toolNode)
    .addNode("respond", responseNode)
    .addEdge(START, "conversation")
    .addConditionalEdges("conversation", shouldContinue, {
      tools: "tools",
      end: END,
    })
    .addEdge("tools", "respond")
    .addEdge("respond", END);

  return workflow.compile();
}

export const bookAgent = createBookAgent();
```

### 使用示例

```typescript
// 使用 Agent
import { bookAgent } from "./book-agent";
import { HumanMessage } from "@langchain/core/messages";

async function chat(userMessage: string, previousMessages: BaseMessage[] = []) {
  const result = await bookAgent.invoke({
    messages: [...previousMessages, new HumanMessage(userMessage)],
    preferences: {},
    books: [],
    needsMoreInfo: true,
  });

  return {
    response: result.messages[result.messages.length - 1].content,
    books: result.books,
    messages: result.messages,
  };
}

// 模拟对话
async function main() {
  let messages = [];

  // 第一轮
  let result = await chat("我想找一些AI相关的书籍");
  console.log("AI:", result.response);
  messages = result.messages;

  // 第二轮
  result = await chat("机器学习方向，中级开发者", messages);
  console.log("AI:", result.response);
  messages = result.messages;

  // 第三轮（如果需要）
  result = await chat("Python语言，实践性强的", messages);
  console.log("AI:", result.response);
  console.log("Books:", result.books);
}
```

---

## 最佳实践

### 1. 状态设计原则

```typescript
// ✅ 好的状态设计
interface GoodState {
  // 输入数据
  input: string;

  // 累积数据（使用 reducer 合并）
  collectedInfo: Record<string, any>;

  // 结果数据
  results: any[];

  // 流程控制
  phase: string;
  shouldContinue: boolean;
}

// ❌ 避免的状态设计
interface BadState {
  // 过于复杂的嵌套
  deeply: { nested: { data: { that: { is: { hard: { to: { manage: any } } } } } } };

  // 重复数据
  userInput: string;
  lastUserInput: string;
  previousUserInput: string;
}
```

### 2. 节点设计原则

```typescript
// ✅ 单一职责
async function analyzeNode(state) {
  // 只做分析
  return { analysis: await analyze(state.input) };
}

async function searchNode(state) {
  // 只做搜索
  return { results: await search(state.analysis) };
}

// ❌ 避免大而全的节点
async function doEverythingNode(state) {
  const analysis = await analyze(state.input);
  const results = await search(analysis);
  const formatted = await format(results);
  const response = await generateResponse(formatted);
  return { analysis, results, formatted, response };
}
```

### 3. 错误处理

```typescript
async function robustNode(state: State): Promise<Partial<State>> {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await riskyOperation(state);
      return { result, error: null };
    } catch (error) {
      if (i === maxRetries - 1) {
        return {
          error: `操作失败: ${error.message}`,
          fallbackResult: getDefaultResult(),
        };
      }
      // 指数退避
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

### 4. 测试策略

```typescript
// 单元测试节点
describe("analyzeIntent", () => {
  it("should extract topic from user message", async () => {
    const state = { userMessage: "我想学习机器学习", messages: [] };
    const result = await analyzeIntent(state);
    expect(result.preferences.topic).toContain("机器学习");
  });
});

// 集成测试整个图
describe("BookAgent", () => {
  it("should complete full conversation flow", async () => {
    const agent = createBookAgent();

    // 模拟多轮对话
    let state = await agent.invoke({
      messages: [new HumanMessage("推荐Python书籍")],
      preferences: {},
      books: [],
      needsMoreInfo: true,
    });

    expect(state.needsMoreInfo).toBe(true);

    state = await agent.invoke({
      ...state,
      messages: [...state.messages, new HumanMessage("中级水平")],
    });

    expect(state.books.length).toBeGreaterThan(0);
  });
});
```

---

## 与当前实现对比

### 当前实现（简单版）

```typescript
// 当前: 基于正则的简单实现
const searchMatch = response.match(/\[SEARCH:\s*([^\]]+)\]/i);
if (searchMatch) {
  // 执行搜索
}
```

**优点:**

- 简单易懂
- 无需额外依赖
- 快速实现

**缺点:**

- 状态管理困难
- 扩展性差
- 没有类型安全
- 测试困难

### LangGraph 实现

```typescript
// LangGraph: 基于状态图的实现
const graph = new StateGraph(StateAnnotation)
  .addNode("analyze", analyzeNode)
  .addNode("search", searchNode)
  .addConditionalEdges("analyze", router);
```

**优点:**

- 清晰的状态管理
- 可视化工作流
- 易于扩展和修改
- 完善的类型系统
- 支持持久化和恢复
- 便于测试

**缺点:**

- 学习曲线
- 额外依赖
- 配置较复杂

### 迁移建议

1. **保持 API 兼容**: 新旧实现使用相同的 API 接口
2. **渐进式迁移**: 先在新功能上使用 LangGraph
3. **并行运行**: 可以同时保留两种实现进行对比

---

## 参考资源

- [LangGraph 官方文档](https://langchain-ai.github.io/langgraph/)
- [LangChain 官方文档](https://python.langchain.com/docs/)
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)
- [LangGraph 示例](https://github.com/langchain-ai/langgraph/tree/main/examples)

---

## 下一步

1. **安装 LangGraph 依赖**
2. **创建状态定义文件**
3. **实现各个节点函数**
4. **构建并测试图**
5. **替换现有 API 实现**
6. **添加流式响应支持**
