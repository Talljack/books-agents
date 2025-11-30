/**
 * 模型配置类型定义
 * 支持多种 LLM 服务商和本地模型
 */

/**
 * 支持的 LLM 服务商
 */
export type LLMProvider =
  | "openai" // OpenAI
  | "anthropic" // Anthropic Claude
  | "google" // Google Gemini
  | "deepseek" // DeepSeek
  | "ollama" // Ollama 本地模型
  | "groq" // Groq (超快推理)
  | "together" // Together AI
  | "fireworks" // Fireworks AI
  | "mistral" // Mistral AI
  | "cohere" // Cohere
  | "moonshot" // Moonshot (Kimi)
  | "zhipu" // 智谱 AI
  | "baichuan" // 百川智能
  | "yi" // 零一万物
  | "minimax" // MiniMax
  | "openrouter" // OpenRouter (聚合多种模型)
  | "siliconflow" // 硅基流动
  | "custom"; // 自定义 OpenAI 兼容接口

/**
 * 服务商配置
 */
export interface ProviderConfig {
  id: LLMProvider;
  name: string;
  description: string;
  baseUrl: string;
  requiresApiKey: boolean;
  models: ModelInfo[];
  icon?: string;
}

/**
 * 模型信息
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    input: number; // 每 1M tokens
    output: number;
  };
  isFree?: boolean;
}

/**
 * 用户的模型配置
 */
export interface UserModelConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  // Ollama 特定配置
  ollamaHost?: string;
}

/**
 * 存储在 localStorage 的完整配置
 */
export interface StoredModelConfig {
  activeConfig: UserModelConfig;
  savedConfigs: {
    [provider: string]: {
      apiKey?: string;
      baseUrl?: string;
      lastModel?: string;
    };
  };
}

/**
 * 预定义的服务商配置
 */
export const PROVIDERS: ProviderConfig[] = [
  // ========== 国际主流服务商 ==========
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4, o1 等模型",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    icon: "🤖",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        description: "最新旗舰",
        contextLength: 128000,
        pricing: { input: 2.5, output: 10 },
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        description: "性价比高",
        contextLength: 128000,
        pricing: { input: 0.15, output: 0.6 },
      },
      {
        id: "o1",
        name: "o1",
        description: "深度推理",
        contextLength: 200000,
        pricing: { input: 15, output: 60 },
      },
      {
        id: "o1-mini",
        name: "o1 Mini",
        description: "轻量推理",
        contextLength: 128000,
        pricing: { input: 3, output: 12 },
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        description: "速度快",
        contextLength: 128000,
        pricing: { input: 10, output: 30 },
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "经济实惠",
        contextLength: 16385,
        pricing: { input: 0.5, output: 1.5 },
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5, Claude 3 系列",
    baseUrl: "https://api.anthropic.com/v1",
    requiresApiKey: true,
    icon: "🧠",
    models: [
      {
        id: "claude-sonnet-4-20250514",
        name: "Claude Sonnet 4",
        description: "最新旗舰",
        contextLength: 200000,
        pricing: { input: 3, output: 15 },
      },
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        description: "高性能",
        contextLength: 200000,
        pricing: { input: 3, output: 15 },
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        description: "最强推理",
        contextLength: 200000,
        pricing: { input: 15, output: 75 },
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        description: "快速便宜",
        contextLength: 200000,
        pricing: { input: 0.8, output: 4 },
      },
    ],
  },
  {
    id: "google",
    name: "Google Gemini",
    description: "Gemini 2.0, 1.5 系列",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresApiKey: true,
    icon: "💎",
    models: [
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        description: "最新快速",
        contextLength: 1000000,
        pricing: { input: 0.075, output: 0.3 },
      },
      {
        id: "gemini-2.0-flash-lite",
        name: "Gemini 2.0 Flash Lite",
        description: "超轻量",
        contextLength: 1000000,
        pricing: { input: 0.075, output: 0.3 },
      },
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        description: "长文本专家",
        contextLength: 2000000,
        pricing: { input: 1.25, output: 5 },
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        description: "快速响应",
        contextLength: 1000000,
        pricing: { input: 0.075, output: 0.3 },
      },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "性价比之王，推理能力强",
    baseUrl: "https://api.deepseek.com/v1",
    requiresApiKey: true,
    icon: "🔍",
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek V3",
        description: "最新版本",
        contextLength: 64000,
        pricing: { input: 0.27, output: 1.1 },
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek R1",
        description: "推理增强",
        contextLength: 64000,
        pricing: { input: 0.55, output: 2.19 },
      },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    description: "欧洲顶级 AI，开源先锋",
    baseUrl: "https://api.mistral.ai/v1",
    requiresApiKey: true,
    icon: "🌬️",
    models: [
      {
        id: "mistral-large-latest",
        name: "Mistral Large",
        description: "旗舰模型",
        contextLength: 128000,
        pricing: { input: 2, output: 6 },
      },
      {
        id: "mistral-medium-latest",
        name: "Mistral Medium",
        description: "均衡选择",
        contextLength: 32000,
        pricing: { input: 2.7, output: 8.1 },
      },
      {
        id: "mistral-small-latest",
        name: "Mistral Small",
        description: "快速便宜",
        contextLength: 32000,
        pricing: { input: 0.2, output: 0.6 },
      },
      {
        id: "codestral-latest",
        name: "Codestral",
        description: "代码专家",
        contextLength: 32000,
        pricing: { input: 0.2, output: 0.6 },
      },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    description: "超快推理，有免费额度",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    icon: "⚡",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B",
        description: "最强开源",
        contextLength: 128000,
        pricing: { input: 0.59, output: 0.79 },
      },
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B",
        description: "超快响应",
        contextLength: 128000,
        pricing: { input: 0.05, output: 0.08 },
      },
      {
        id: "mixtral-8x7b-32768",
        name: "Mixtral 8x7B",
        description: "MoE 架构",
        contextLength: 32768,
        pricing: { input: 0.24, output: 0.24 },
      },
      {
        id: "gemma2-9b-it",
        name: "Gemma 2 9B",
        description: "Google 开源",
        contextLength: 8192,
        pricing: { input: 0.2, output: 0.2 },
      },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    description: "开源模型托管平台",
    baseUrl: "https://api.together.xyz/v1",
    requiresApiKey: true,
    icon: "🤝",
    models: [
      {
        id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        name: "Llama 3.3 70B Turbo",
        description: "快速版",
        contextLength: 128000,
        pricing: { input: 0.88, output: 0.88 },
      },
      {
        id: "Qwen/Qwen2.5-72B-Instruct-Turbo",
        name: "Qwen 2.5 72B Turbo",
        description: "中文强",
        contextLength: 32768,
        pricing: { input: 1.2, output: 1.2 },
      },
      {
        id: "deepseek-ai/DeepSeek-R1",
        name: "DeepSeek R1",
        description: "推理模型",
        contextLength: 64000,
        pricing: { input: 3, output: 7 },
      },
      {
        id: "mistralai/Mixtral-8x22B-Instruct-v0.1",
        name: "Mixtral 8x22B",
        description: "大型 MoE",
        contextLength: 65536,
        pricing: { input: 1.2, output: 1.2 },
      },
    ],
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    description: "高性能模型推理",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    requiresApiKey: true,
    icon: "🎆",
    models: [
      {
        id: "accounts/fireworks/models/llama-v3p3-70b-instruct",
        name: "Llama 3.3 70B",
        description: "高性能",
        contextLength: 128000,
        pricing: { input: 0.9, output: 0.9 },
      },
      {
        id: "accounts/fireworks/models/qwen2p5-72b-instruct",
        name: "Qwen 2.5 72B",
        description: "中文优化",
        contextLength: 32768,
        pricing: { input: 0.9, output: 0.9 },
      },
      {
        id: "accounts/fireworks/models/deepseek-r1",
        name: "DeepSeek R1",
        description: "推理增强",
        contextLength: 64000,
        pricing: { input: 3, output: 8 },
      },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    description: "企业级 AI，RAG 专家",
    baseUrl: "https://api.cohere.ai/v1",
    requiresApiKey: true,
    icon: "🔗",
    models: [
      {
        id: "command-r-plus",
        name: "Command R+",
        description: "旗舰模型",
        contextLength: 128000,
        pricing: { input: 2.5, output: 10 },
      },
      {
        id: "command-r",
        name: "Command R",
        description: "均衡选择",
        contextLength: 128000,
        pricing: { input: 0.15, output: 0.6 },
      },
      {
        id: "command-light",
        name: "Command Light",
        description: "轻量快速",
        contextLength: 4096,
        pricing: { input: 0.03, output: 0.06 },
      },
    ],
  },
  // ========== 国内服务商 ==========
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    description: "月之暗面，长文本专家",
    baseUrl: "https://api.moonshot.cn/v1",
    requiresApiKey: true,
    icon: "🌙",
    models: [
      {
        id: "moonshot-v1-8k",
        name: "Moonshot V1 (8K)",
        description: "标准版",
        contextLength: 8000,
        pricing: { input: 12, output: 12 },
      },
      {
        id: "moonshot-v1-32k",
        name: "Moonshot V1 (32K)",
        description: "长文本",
        contextLength: 32000,
        pricing: { input: 24, output: 24 },
      },
      {
        id: "moonshot-v1-128k",
        name: "Moonshot V1 (128K)",
        description: "超长文本",
        contextLength: 128000,
        pricing: { input: 60, output: 60 },
      },
    ],
  },
  {
    id: "zhipu",
    name: "智谱 AI",
    description: "GLM 系列，中文理解强",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    requiresApiKey: true,
    icon: "🧩",
    models: [
      {
        id: "glm-4-plus",
        name: "GLM-4 Plus",
        description: "最强版本",
        contextLength: 128000,
        pricing: { input: 50, output: 50 },
      },
      {
        id: "glm-4-air",
        name: "GLM-4 Air",
        description: "性价比高",
        contextLength: 128000,
        pricing: { input: 1, output: 1 },
      },
      {
        id: "glm-4-flash",
        name: "GLM-4 Flash",
        description: "快速便宜",
        contextLength: 128000,
        pricing: { input: 0.1, output: 0.1 },
      },
      {
        id: "glm-4-long",
        name: "GLM-4 Long",
        description: "超长文本",
        contextLength: 1000000,
        pricing: { input: 1, output: 1 },
      },
    ],
  },
  {
    id: "baichuan",
    name: "百川智能",
    description: "Baichuan 系列，中文优化",
    baseUrl: "https://api.baichuan-ai.com/v1",
    requiresApiKey: true,
    icon: "🏔️",
    models: [
      {
        id: "Baichuan4",
        name: "Baichuan 4",
        description: "最新旗舰",
        contextLength: 32000,
        pricing: { input: 100, output: 100 },
      },
      {
        id: "Baichuan3-Turbo",
        name: "Baichuan 3 Turbo",
        description: "快速版",
        contextLength: 32000,
        pricing: { input: 12, output: 12 },
      },
      {
        id: "Baichuan3-Turbo-128k",
        name: "Baichuan 3 Turbo 128K",
        description: "长文本",
        contextLength: 128000,
        pricing: { input: 24, output: 24 },
      },
    ],
  },
  {
    id: "yi",
    name: "零一万物",
    description: "Yi 系列，李开复创办",
    baseUrl: "https://api.lingyiwanwu.com/v1",
    requiresApiKey: true,
    icon: "🌟",
    models: [
      {
        id: "yi-large",
        name: "Yi Large",
        description: "旗舰模型",
        contextLength: 32000,
        pricing: { input: 20, output: 20 },
      },
      {
        id: "yi-medium",
        name: "Yi Medium",
        description: "均衡选择",
        contextLength: 16000,
        pricing: { input: 2.5, output: 2.5 },
      },
      {
        id: "yi-spark",
        name: "Yi Spark",
        description: "轻量快速",
        contextLength: 16000,
        pricing: { input: 1, output: 1 },
      },
      {
        id: "yi-large-turbo",
        name: "Yi Large Turbo",
        description: "快速旗舰",
        contextLength: 16000,
        pricing: { input: 12, output: 12 },
      },
    ],
  },
  {
    id: "minimax",
    name: "MiniMax",
    description: "abab 系列，多模态强",
    baseUrl: "https://api.minimax.chat/v1",
    requiresApiKey: true,
    icon: "🎯",
    models: [
      {
        id: "abab6.5s-chat",
        name: "abab 6.5s",
        description: "最新版本",
        contextLength: 245760,
        pricing: { input: 30, output: 30 },
      },
      {
        id: "abab6.5-chat",
        name: "abab 6.5",
        description: "旗舰模型",
        contextLength: 8192,
        pricing: { input: 30, output: 30 },
      },
      {
        id: "abab5.5-chat",
        name: "abab 5.5",
        description: "均衡选择",
        contextLength: 16384,
        pricing: { input: 15, output: 15 },
      },
    ],
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    description: "国产模型聚合，有免费额度",
    baseUrl: "https://api.siliconflow.cn/v1",
    requiresApiKey: true,
    icon: "🌊",
    models: [
      {
        id: "deepseek-ai/DeepSeek-V3",
        name: "DeepSeek V3",
        description: "最强开源",
        contextLength: 64000,
        pricing: { input: 2, output: 8 },
      },
      {
        id: "Qwen/Qwen2.5-72B-Instruct",
        name: "Qwen 2.5 72B",
        description: "阿里旗舰",
        contextLength: 32768,
        pricing: { input: 4, output: 4 },
      },
      {
        id: "deepseek-ai/DeepSeek-R1",
        name: "DeepSeek R1",
        description: "推理模型",
        contextLength: 64000,
        pricing: { input: 4, output: 16 },
      },
      {
        id: "THUDM/glm-4-9b-chat",
        name: "GLM-4 9B",
        description: "免费模型",
        contextLength: 128000,
        isFree: true,
      },
      {
        id: "Qwen/Qwen2.5-7B-Instruct",
        name: "Qwen 2.5 7B",
        description: "免费模型",
        contextLength: 32768,
        isFree: true,
      },
    ],
  },
  // ========== 聚合平台 ==========
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "聚合多种模型，有免费额度",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    icon: "🔀",
    models: [
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        name: "Llama 3.3 70B (Free)",
        description: "免费模型",
        isFree: true,
      },
      {
        id: "qwen/qwen-2.5-72b-instruct:free",
        name: "Qwen 2.5 72B (Free)",
        description: "免费中文",
        isFree: true,
      },
      {
        id: "google/gemini-2.0-flash-exp:free",
        name: "Gemini 2.0 Flash (Free)",
        description: "免费快速",
        isFree: true,
      },
      {
        id: "deepseek/deepseek-r1:free",
        name: "DeepSeek R1 (Free)",
        description: "免费推理",
        isFree: true,
      },
      {
        id: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        description: "付费强力",
        pricing: { input: 3, output: 15 },
      },
      {
        id: "openai/gpt-4o",
        name: "GPT-4o",
        description: "付费 OpenAI",
        pricing: { input: 2.5, output: 10 },
      },
      {
        id: "google/gemini-pro-1.5",
        name: "Gemini 1.5 Pro",
        description: "付费 Google",
        pricing: { input: 1.25, output: 5 },
      },
    ],
  },
  // ========== 本地模型 ==========
  {
    id: "ollama",
    name: "Ollama",
    description: "本地运行的开源模型，完全免费",
    baseUrl: "http://localhost:11434",
    requiresApiKey: false,
    icon: "🦙",
    models: [
      { id: "llama3.2:latest", name: "Llama 3.2 (3B)", description: "轻量快速", isFree: true },
      { id: "llama3.3:latest", name: "Llama 3.3 (70B)", description: "更强大", isFree: true },
      { id: "qwen2.5:7b", name: "Qwen 2.5 (7B)", description: "中英文都好", isFree: true },
      { id: "mistral:7b", name: "Mistral (7B)", description: "英文好", isFree: true },
      { id: "deepseek-r1:32b", name: "DeepSeek R1 (32B)", description: "推理能力强", isFree: true },
      { id: "gemma2:9b", name: "Gemma 2 (9B)", description: "Google 模型", isFree: true },
      { id: "phi3:14b", name: "Phi-3 (14B)", description: "微软模型", isFree: true },
    ],
  },
  // ========== 自定义 ==========
  {
    id: "custom",
    name: "自定义",
    description: "自定义 OpenAI 兼容接口",
    baseUrl: "",
    requiresApiKey: true,
    icon: "⚙️",
    models: [{ id: "custom", name: "自定义模型", description: "手动输入模型名称" }],
  },
];

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: UserModelConfig = {
  provider: "ollama",
  model: "llama3.2:latest",
  ollamaHost: "http://localhost:11434",
};

/**
 * 获取服务商配置
 */
export function getProviderConfig(providerId: LLMProvider): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === providerId);
}

/**
 * 获取模型信息
 */
export function getModelInfo(providerId: LLMProvider, modelId: string): ModelInfo | undefined {
  const provider = getProviderConfig(providerId);
  return provider?.models.find((m) => m.id === modelId);
}
