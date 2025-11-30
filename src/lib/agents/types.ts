import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { Book } from "@/types/book";

/**
 * 用户偏好类型
 */
export interface UserPreferences {
  topic?: string; // 主题/领域
  level?: "beginner" | "intermediate" | "advanced"; // 技术水平
  language?: "en" | "zh" | "any"; // 语言偏好
  bookType?: "practical" | "theoretical" | "both"; // 书籍类型
  yearPreference?: "latest" | "classic" | "any"; // 出版年份偏好
}

/**
 * 推断的偏好（用于前端显示）
 */
export interface InferredPreferences {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  levelLabel: string; // 中文标签
  language: "en" | "zh" | "any";
  languageLabel: string; // 中文标签
  confidence: number; // 推断置信度 0-1
  isFiction?: boolean; // 是否是文学/小说类
  bookType?: "practical" | "theoretical" | "both"; // 书籍类型：实战/理论/两者
  bookTypeLabel?: string; // 书籍类型中文标签
  searchKeywords?: string[]; // LLM 建议的搜索关键词
}

/**
 * LangGraph 状态注解
 * 使用 Annotation 定义状态结构和更新规则
 */
export const BookAgentState = Annotation.Root({
  // 对话消息历史 - 累加模式
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // 用户偏好 - 合并模式
  preferences: Annotation<UserPreferences>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // 推断的偏好（用于前端显示可调整选项）
  inferredPreferences: Annotation<InferredPreferences | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),

  // 搜索结果书籍
  books: Annotation<Book[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // 搜索查询
  searchQuery: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),

  // 是否需要更多信息
  needsMoreInfo: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => true,
  }),

  // 缺失的信息字段
  missingFields: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => ["topic", "level"],
  }),

  // 当前阶段
  phase: Annotation<"gathering" | "searching" | "presenting" | "complete">({
    reducer: (_, update) => update,
    default: () => "gathering",
  }),

  // 错误信息
  error: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),

  // 重试次数
  retryCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
});

// 导出状态类型
export type BookAgentStateType = typeof BookAgentState.State;

/**
 * 意图分析结果
 */
export interface IntentAnalysisResult {
  preferences: Partial<UserPreferences>;
  needsMoreInfo: boolean;
  missingFields: string[];
  shouldSearch: boolean;
}

/**
 * 搜索工具参数
 */
export interface SearchToolParams {
  query: string;
  maxResults?: number;
  language?: string;
}
