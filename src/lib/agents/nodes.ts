import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { BookAgentStateType, UserPreferences, InferredPreferences } from "./types";
import { searchBooksTool } from "./tools";
import { Book } from "@/types/book";

// 检查是否使用 OpenRouter
const isOpenRouter = !!process.env.OPENROUTER_API_KEY;

// 检测模型是否支持 Function Calling
// 大多数免费模型不支持，需要使用 prompt-based 方式
const MODEL_NAME = isOpenRouter
  ? process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free"
  : "gpt-4o";

// 支持 Function Calling 的模型列表
const TOOL_CALLING_MODELS = [
  "gpt-4o", "gpt-4", "gpt-3.5-turbo",
  "claude-3", "claude-2",
  "mistral-large", "mistral-medium"
];

const supportsToolCalling = TOOL_CALLING_MODELS.some(m => MODEL_NAME.includes(m));

/**
 * 创建 LLM 实例
 */
export function createLLM() {
  return new ChatOpenAI({
    modelName: MODEL_NAME,
    temperature: 0.7,
    maxTokens: 1000,
    configuration: {
      baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
      defaultHeaders: isOpenRouter
        ? {
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "BookFinder AI",
          }
        : undefined,
    },
    apiKey: isOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY,
  });
}

/**
 * LLM 意图分析结果
 */
interface AnalyzedIntent {
  topic: string;
  category: "technical" | "fiction" | "other";
  level?: "beginner" | "intermediate" | "advanced";
  language: "zh" | "en";
  bookType?: "practical" | "theoretical" | "both";
  searchKeywords: string[];
}

/**
 * 使用 LLM 智能分析用户意图
 */
async function analyzeUserIntent(userMessage: string): Promise<AnalyzedIntent> {
  const llm = createLLM();

  const prompt = `你是一个专业的图书推荐意图分析专家。请仔细分析用户的书籍搜索需求。

用户输入: "${userMessage}"

请深入理解用户的真实意图，特别注意：
1. 用户是否明确表达了对"理论/原理"还是"实战/使用"的偏好
2. 用户提到的具体技术领域或主题
3. 用户的经验水平暗示
4. 如果用户提到了具体的书名（如《三体》），要理解这是作为参考/类似推荐

返回以下 JSON（不要包含其他文字）:
{
  "topic": "核心搜索主题（具体的类型/领域名称）",
  "category": "technical（技术/编程/学习类）或 fiction（小说/文学/故事类）或 other（其他）",
  "level": "beginner/intermediate/advanced 或 null",
  "language": "zh 或 en（根据用户输入语言）",
  "bookType": "practical 或 theoretical 或 both 或 null",
  "searchKeywords": ["关键词1", "关键词2"]
}

【极其重要】关于 searchKeywords 的规则：
1. 对于小说/文学类（fiction）：
   - 只生成1-2个关键词！不要超过2个！
   - 第一个关键词必须是具体的类型（如"科幻小说"、"悬疑小说"、"武侠小说"）
   - 绝对不要加"推荐"、"热门"、"经典"、"畅销"这种修饰词
   - 如果用户提到参考书名，可以只用那个书名或作者名作为第二个关键词
   
2. 对于技术类（technical）：
   - 生成2-4个搜索词
   - 根据 bookType 选择合适的修饰词

示例：
- "推荐科幻小说" → {"topic": "科幻小说", "category": "fiction", "searchKeywords": ["科幻小说"]}
- "找一些比较热门的科幻小说，类似于《三体》" → {"topic": "科幻小说", "category": "fiction", "searchKeywords": ["科幻小说", "三体"]}
- "悬疑推理小说，像东野圭吾那种" → {"topic": "悬疑推理", "category": "fiction", "searchKeywords": ["悬疑小说", "东野圭吾"]}
- "武侠小说推荐" → {"topic": "武侠小说", "category": "fiction", "searchKeywords": ["武侠小说"]}
- "我想学Python" → {"topic": "Python", "category": "technical", "bookType": "practical", "searchKeywords": ["Python入门", "Python编程"]}
- "我想要技术书籍，偏技术一些而不是使用" → {"topic": "计算机技术", "category": "technical", "bookType": "theoretical", "searchKeywords": ["计算机原理", "系统设计"]}`;

  try {
    const response = await llm.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : "";

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("[Node] LLM raw response:", parsed);
      return {
        topic: parsed.topic || userMessage,
        category: parsed.category || "other",
        level: parsed.level || undefined,
        language: parsed.language || (/[\u4e00-\u9fff]/.test(userMessage) ? "zh" : "en"),
        bookType: parsed.bookType || undefined,
        searchKeywords: parsed.searchKeywords || [parsed.topic || userMessage],
      };
    }
  } catch (error) {
    console.error("[Node] Intent analysis error:", error);
  }

  // 降级：简单规则分析
  const hasChinese = /[\u4e00-\u9fff]/.test(userMessage);
  const hasTheoreticalHint = /原理|底层|理论|设计|实现|架构|不是使用|不是教程|偏技术/.test(userMessage);
  const hasPracticalHint = /实战|教程|入门|使用|项目|实践|开发/.test(userMessage);
  
  let bookType: "practical" | "theoretical" | "both" | undefined;
  if (hasTheoreticalHint && !hasPracticalHint) {
    bookType = "theoretical";
  } else if (hasPracticalHint && !hasTheoreticalHint) {
    bookType = "practical";
  }

  return {
    topic: userMessage,
    category: "other",
    level: undefined,
    language: hasChinese ? "zh" : "en",
    bookType,
    searchKeywords: [userMessage],
  };
}

/**
 * 国际化标签
 */
const i18n = {
  zh: {
    level: {
      beginner: "入门",
      intermediate: "进阶",
      advanced: "高级",
    },
    bookType: {
      practical: "实战",
      theoretical: "理论",
      both: "综合",
    },
    language: {
      zh: "中文",
      en: "英文",
      any: "不限",
    },
    fiction: "推荐",
  },
  en: {
    level: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },
    bookType: {
      practical: "Practical",
      theoretical: "Theoretical",
      both: "Comprehensive",
    },
    language: {
      zh: "Chinese",
      en: "English",
      any: "Any",
    },
    fiction: "Recommended",
  },
};

/**
 * 智能推断用户偏好（使用 LLM）
 */
async function inferPreferencesWithLLM(userMessage: string): Promise<InferredPreferences> {
  const intent = await analyzeUserIntent(userMessage);

  console.log("[Node] LLM analyzed intent:", intent);

  // 根据用户输入语言选择标签语言
  const labels = i18n[intent.language];

  return {
    topic: intent.topic,
    level: intent.level || "beginner",
    levelLabel: intent.level ? labels.level[intent.level] : (intent.category === "fiction" ? labels.fiction : labels.level.beginner),
    language: intent.language,
    languageLabel: labels.language[intent.language],
    confidence: 0.85,
    isFiction: intent.category === "fiction",
    bookType: intent.bookType,
    bookTypeLabel: intent.bookType ? labels.bookType[intent.bookType] : undefined,
    searchKeywords: intent.searchKeywords,
  };
}

/**
 * 构建搜索查询
 * 优先使用 LLM 生成的搜索关键词，否则基于偏好构建
 */
function buildSearchQuery(preferences: InferredPreferences): string {
  // 如果有 LLM 生成的搜索关键词，直接使用
  if (preferences.searchKeywords && preferences.searchKeywords.length > 0) {
    console.log("[Node] Using LLM-generated keywords:", preferences.searchKeywords);
    return preferences.searchKeywords.join(" ");
  }

  // 降级：基于偏好构建查询
  const parts = [preferences.topic];

  // 根据书籍类型添加修饰词
  if (!preferences.isFiction) {
    if (preferences.bookType === "theoretical") {
      // 理论类：添加原理相关词
      const theoreticalKeywords = preferences.language === "zh" 
        ? ["原理", "设计", "深入"] 
        : ["principles", "internals", "design"];
      parts.push(theoreticalKeywords[0]);
    } else if (preferences.bookType === "practical") {
      // 实战类：添加实战相关词
      if (preferences.level === "beginner") {
        parts.push(preferences.language === "zh" ? "入门" : "beginner");
      } else if (preferences.level === "intermediate") {
        parts.push(preferences.language === "zh" ? "实战" : "practical");
      } else if (preferences.level === "advanced") {
        parts.push(preferences.language === "zh" ? "高级" : "advanced");
      }
    } else {
      // 默认：根据难度添加
      if (preferences.levelLabel !== "推荐") {
        if (preferences.level === "beginner") {
          parts.push(preferences.language === "zh" ? "入门" : "beginner");
        } else if (preferences.level === "intermediate") {
          parts.push(preferences.language === "zh" ? "进阶" : "intermediate");
        } else if (preferences.level === "advanced") {
          parts.push(preferences.language === "zh" ? "高级" : "advanced");
        }
      }
    }
  }

  return parts.join(" ");
}

// 系统提示词 - 直接搜索模式（多语言）
const SYSTEM_PROMPTS = {
  zh: `你是一个专业友好的图书推荐助手。用户的请求已经被处理，现在需要你生成简短的推荐说明。

## 任务
根据搜索结果，用1-2句话说明这些书籍为什么适合用户。保持简洁友好。

## 重要规则
- 不要问问题，直接给出推荐说明
- 用中文回复
- 保持简洁，不超过3句话`,
  en: `You are a professional and friendly book recommendation assistant. The user's request has been processed, now generate a brief recommendation.

## Task
Based on the search results, explain in 1-2 sentences why these books are suitable for the user. Keep it concise and friendly.

## Important Rules
- Don't ask questions, just provide the recommendation
- Reply in English
- Keep it brief, no more than 3 sentences`,
};

/**
 * 对话节点 - 智能推断 + 立即搜索
 */
export async function conversationNode(
  state: BookAgentStateType
): Promise<Partial<BookAgentStateType>> {
  // 获取用户最新消息
  const lastMessage = state.messages[state.messages.length - 1];
  const userMessage = typeof lastMessage.content === "string" ? lastMessage.content : "";

  // 使用 LLM 智能分析用户意图
  const inferred = await inferPreferencesWithLLM(userMessage);
  console.log("[Node] Inferred preferences:", inferred);

  // 构建搜索查询
  const searchQuery = buildSearchQuery(inferred);
  console.log("[Node] Search query:", searchQuery);

  // 创建带有工具调用的消息，立即搜索
  const searchingText = inferred.isFiction
    ? `正在为您搜索${inferred.topic}...`
    : `正在为您搜索${inferred.levelLabel}级别的${inferred.topic}书籍...`;

  const aiMessageWithToolCall = new AIMessage({
    content: searchingText,
    tool_calls: [
      {
        id: `search_${Date.now()}`,
        name: "search_books",
        args: { query: searchQuery, maxResults: 10 },
      },
    ],
  });

  return {
    messages: [aiMessageWithToolCall],
    inferredPreferences: inferred,
    preferences: {
      topic: inferred.topic,
      level: inferred.level,
      language: inferred.language,
    },
    needsMoreInfo: false,
    phase: "searching",
    searchQuery,
  };
}

/**
 * 工具执行节点 - 执行搜索工具
 */
export async function toolNode(
  state: BookAgentStateType
): Promise<Partial<BookAgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];

  // 检查是否是 AI 消息且有工具调用
  if (!("tool_calls" in lastMessage)) {
    console.log("[Node] No tool calls found");
    return {};
  }
  
  const aiMessage = lastMessage as AIMessage;
  const toolCalls = aiMessage.tool_calls;
  if (!toolCalls || toolCalls.length === 0) {
    console.log("[Node] No tool calls found");
    return {};
  }

  const toolCall = toolCalls[0];
  console.log("[Node] Executing tool:", toolCall.name, toolCall.args);

  if (toolCall.name === "search_books") {
    try {
      const args = toolCall.args as { query: string; maxResults?: number; language?: "en" | "zh" | "any" };
      const result = await searchBooksTool.invoke(args);
      const books = result as Book[];

      // 创建工具响应消息
      const toolMessage = new ToolMessage({
        tool_call_id: toolCall.id || "search_call",
        content: JSON.stringify({
          success: true,
          count: books.length,
          books: books.map((b: Book) => ({ title: b.title, authors: b.authors })),
        }),
      });

      return {
        books,
        searchQuery: args.query,
        messages: [toolMessage],
        phase: "presenting",
      };
    } catch (error) {
      console.error("[Node] Tool execution error:", error);

      const toolMessage = new ToolMessage({
        tool_call_id: toolCall.id || "search_call",
        content: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "搜索失败",
        }),
      });

      return {
        messages: [toolMessage],
        error: `搜索失败: ${error instanceof Error ? error.message : "未知错误"}`,
        retryCount: state.retryCount + 1,
      };
    }
  }

  return {};
}

/**
 * 响应生成节点 - 生成最终推荐响应
 */
export async function responseNode(
  state: BookAgentStateType
): Promise<Partial<BookAgentStateType>> {
  const llm = createLLM();
  const inferred = state.inferredPreferences;

  // 确定响应语言
  const lang = inferred?.language || "zh";
  const isEnglish = lang === "en";

  if (state.books.length === 0) {
    const message = new AIMessage(
      isEnglish 
        ? "Sorry, no books found matching your criteria. Try adjusting your search terms."
        : "抱歉，没有找到符合条件的书籍。您可以尝试调整搜索条件或换一些关键词。"
    );
    return {
      messages: [message],
      phase: "complete",
    };
  }

  // 生成推荐说明
  const booksInfo = state.books
    .slice(0, 5)
    .map((b, i) => `${i + 1}. "${b.title}" - ${b.authors.join(", ")}`)
    .join("\n");

  const inferredInfo = inferred
    ? (isEnglish 
        ? `Inferred preferences: Topic=${inferred.topic}, Level=${inferred.levelLabel}, Language=${inferred.languageLabel}`
        : `推断的偏好: 主题=${inferred.topic}, 难度=${inferred.levelLabel}, 语言=${inferred.languageLabel}`)
    : "";

  const prompt = isEnglish
    ? `Based on the following information, generate a brief recommendation.

${inferredInfo}
Search query: ${state.searchQuery}
Books found:
${booksInfo}

Please explain in 1-2 sentences why these books are suitable for the user. Keep it concise and friendly, don't list the books again.`
    : `根据以下信息，生成简短的推荐说明。

${inferredInfo}
搜索词: ${state.searchQuery}
找到的书籍:
${booksInfo}

请用1-2句话说明为什么这些书适合用户。保持简洁友好，不要重复列出书籍。`;

  try {
    const response = await llm.invoke([
      new SystemMessage(lang === "en" ? SYSTEM_PROMPTS.en : SYSTEM_PROMPTS.zh),
      new HumanMessage(prompt),
    ]);

    return {
      messages: [response],
      phase: "complete",
    };
  } catch (error) {
    // 如果生成失败，使用默认消息
    const message = new AIMessage(
      isEnglish
        ? `Found ${state.books.length} ${inferred?.levelLabel || ""} ${inferred?.topic || "related"} books for you.`
        : `为您找到了 ${state.books.length} 本${inferred?.levelLabel || ""}${inferred?.topic || "相关"}书籍，请查看下方推荐。`
    );
    return {
      messages: [message],
      phase: "complete",
    };
  }
}

// 导出推断函数供 API 使用
export { inferPreferencesWithLLM, buildSearchQuery };

/**
 * 路由函数 - 决定下一步
 */
export function routeAfterConversation(state: BookAgentStateType): string {
  const lastMessage = state.messages[state.messages.length - 1];

  // 如果有错误且重试次数未超限
  if (state.error && state.retryCount < 3) {
    console.log("[Router] Retrying due to error");
    return "conversation";
  }

  // 如果有工具调用，执行工具
  if ("tool_calls" in lastMessage) {
    const aiMessage = lastMessage as AIMessage;
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      console.log("[Router] Routing to tools");
      return "tools";
    }
  }

  // 否则结束（等待用户输入）
  console.log("[Router] Ending conversation turn");
  return "__end__";
}

/**
 * 工具执行后的路由
 */
export function routeAfterTools(state: BookAgentStateType): string {
  // 如果有错误且可重试
  if (state.error && state.retryCount < 3) {
    console.log("[Router] Retrying search");
    return "conversation";
  }

  // 否则生成响应
  console.log("[Router] Generating response");
  return "respond";
}
