/**
 * LLM 工厂
 * 根据配置动态创建 LLM 实例
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { UserModelConfig, getProviderConfig, DEFAULT_CONFIG } from "@/types/model-config";

// 服务端当前配置缓存
let serverConfig: UserModelConfig | null = null;

/**
 * 设置服务端配置
 */
export function setServerConfig(config: UserModelConfig) {
  serverConfig = config;
  console.log("[LLM Factory] Config updated:", {
    provider: config.provider,
    model: config.model,
  });
}

/**
 * 获取当前配置
 * 优先使用服务端配置，否则使用环境变量配置
 */
export function getCurrentConfig(): UserModelConfig {
  if (serverConfig) {
    return serverConfig;
  }

  // 从环境变量检测
  if (process.env.USE_OLLAMA === "true" || process.env.OLLAMA_BASE_URL) {
    return {
      provider: "ollama",
      model: process.env.OLLAMA_MODEL || "llama3.2:latest",
      ollamaHost: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: "openrouter",
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
      apiKey: process.env.OPENROUTER_API_KEY,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
      apiKey: process.env.ANTHROPIC_API_KEY,
    };
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      provider: "deepseek",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      apiKey: process.env.DEEPSEEK_API_KEY,
    };
  }

  // 默认使用 Ollama
  return DEFAULT_CONFIG;
}

/**
 * 创建 LLM 实例
 */
export function createLLM(config?: UserModelConfig): BaseChatModel {
  const cfg = config || getCurrentConfig();

  console.log(`[LLM Factory] Creating LLM: ${cfg.provider} / ${cfg.model}`);

  switch (cfg.provider) {
    // 本地模型
    case "ollama":
      return createOllamaLLM(cfg);

    // 原生 SDK 支持的服务商
    case "openai":
      return createOpenAILLM(cfg);

    case "anthropic":
      return createAnthropicLLM(cfg);

    // Google Gemini (使用 OpenAI 兼容接口)
    case "google":
      return createGoogleLLM(cfg);

    // 聚合平台
    case "openrouter":
      return createOpenRouterLLM(cfg);

    // OpenAI 兼容的服务商
    case "deepseek":
    case "mistral":
    case "groq":
    case "together":
    case "fireworks":
    case "cohere":
    case "moonshot":
    case "zhipu":
    case "baichuan":
    case "yi":
    case "minimax":
    case "siliconflow":
      return createOpenAICompatibleLLM(cfg);

    case "custom":
      return createCustomLLM(cfg);

    default:
      console.warn(`[LLM Factory] Unknown provider: ${cfg.provider}, falling back to Ollama`);
      return createOllamaLLM(DEFAULT_CONFIG);
  }
}

/**
 * 创建 Ollama LLM
 */
function createOllamaLLM(config: UserModelConfig): BaseChatModel {
  const baseUrl = config.ollamaHost || config.baseUrl || "http://localhost:11434";
  
  // 在 Vercel 等 serverless 环境中给出友好提示
  if (process.env.VERCEL && baseUrl.includes("localhost")) {
    console.warn(
      "[LLM Factory] ⚠️ Ollama 无法在 Vercel 等 serverless 环境中运行。" +
      "请在环境变量中配置云端 LLM 提供商（OpenAI、Anthropic、DeepSeek、OpenRouter 等），" +
      "或在 Settings 页面配置。"
    );
  }
  
  return new ChatOllama({
    model: config.model,
    baseUrl,
    temperature: 0.7,
  });
}

/**
 * 创建 OpenAI LLM
 */
function createOpenAILLM(config: UserModelConfig): BaseChatModel {
  return new ChatOpenAI({
    modelName: config.model,
    temperature: 0.7,
    maxTokens: 1000,
    apiKey: config.apiKey || process.env.OPENAI_API_KEY,
  });
}

/**
 * 创建 Anthropic LLM
 */
function createAnthropicLLM(config: UserModelConfig): BaseChatModel {
  return new ChatAnthropic({
    modelName: config.model,
    temperature: 0.7,
    maxTokens: 1000,
    anthropicApiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
  });
}

/**
 * 创建 OpenRouter LLM
 */
function createOpenRouterLLM(config: UserModelConfig): BaseChatModel {
  return new ChatOpenAI({
    modelName: config.model,
    temperature: 0.7,
    maxTokens: 1000,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "BookFinder AI",
      },
    },
    apiKey: config.apiKey || process.env.OPENROUTER_API_KEY,
  });
}

/**
 * 创建 Google Gemini LLM
 * 使用 OpenAI 兼容接口 (通过 OpenRouter 或直接调用)
 */
function createGoogleLLM(config: UserModelConfig): BaseChatModel {
  // Google Gemini 可以通过 OpenAI 兼容的方式调用
  // 使用 generativelanguage.googleapis.com 的 OpenAI 兼容端点
  return new ChatOpenAI({
    modelName: config.model,
    temperature: 0.7,
    maxTokens: 1000,
    configuration: {
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    },
    apiKey: config.apiKey || process.env.GOOGLE_API_KEY,
  });
}

/**
 * 创建 OpenAI 兼容 LLM（DeepSeek, Moonshot, 智谱等）
 */
function createOpenAICompatibleLLM(config: UserModelConfig): BaseChatModel {
  const provider = getProviderConfig(config.provider);
  const baseUrl = config.baseUrl || provider?.baseUrl;

  return new ChatOpenAI({
    modelName: config.model,
    temperature: 0.7,
    maxTokens: 1000,
    configuration: {
      baseURL: baseUrl,
    },
    apiKey: config.apiKey,
  });
}

/**
 * 创建自定义 LLM
 */
function createCustomLLM(config: UserModelConfig): BaseChatModel {
  if (!config.baseUrl) {
    throw new Error("自定义服务商需要配置 API 地址");
  }

  return new ChatOpenAI({
    modelName: config.model,
    temperature: 0.7,
    maxTokens: 1000,
    configuration: {
      baseURL: config.baseUrl,
    },
    apiKey: config.apiKey,
  });
}

/**
 * 获取当前 LLM 信息
 */
export function getLLMInfo(): { provider: string; model: string } {
  const config = getCurrentConfig();
  return {
    provider: config.provider,
    model: config.model,
  };
}
