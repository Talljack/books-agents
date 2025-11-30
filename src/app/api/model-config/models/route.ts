import { NextRequest, NextResponse } from "next/server";
import { LLMProvider, getProviderConfig, ModelInfo } from "@/types/model-config";

/**
 * GET /api/model-config/models?provider=xxx&apiKey=xxx
 * 动态获取指定服务商的可用模型列表
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider") as LLMProvider;
  const apiKey = searchParams.get("apiKey") || "";
  const baseUrl = searchParams.get("baseUrl") || "";

  if (!provider) {
    return NextResponse.json({ error: "缺少 provider 参数" }, { status: 400 });
  }

  try {
    const models = await fetchModels(provider, apiKey, baseUrl);
    return NextResponse.json({ models });
  } catch (error) {
    console.error(`[ModelConfig] Failed to fetch models for ${provider}:`, error);

    // 如果获取失败，返回预定义的模型列表
    const providerConfig = getProviderConfig(provider);
    return NextResponse.json({
      models: providerConfig?.models || [],
      fallback: true,
      error: error instanceof Error ? error.message : "获取模型列表失败",
    });
  }
}

/**
 * 根据服务商获取模型列表
 */
async function fetchModels(
  provider: LLMProvider,
  apiKey: string,
  baseUrl?: string
): Promise<ModelInfo[]> {
  switch (provider) {
    case "ollama":
      return fetchOllamaModels(baseUrl || "http://localhost:11434");

    case "openai":
      return fetchOpenAIModels(apiKey);

    case "anthropic":
      // Anthropic 没有公开的模型列表 API，使用预定义
      return getProviderConfig("anthropic")?.models || [];

    case "google":
      return fetchGoogleModels(apiKey);

    case "groq":
      return fetchGroqModels(apiKey);

    case "together":
      return fetchTogetherModels(apiKey);

    case "openrouter":
      return fetchOpenRouterModels(apiKey);

    case "deepseek":
    case "mistral":
    case "fireworks":
    case "cohere":
    case "moonshot":
    case "zhipu":
    case "baichuan":
    case "yi":
    case "minimax":
    case "siliconflow":
      // 这些服务商大多支持 /models 端点
      return fetchOpenAICompatibleModels(provider, apiKey, baseUrl);

    default:
      return getProviderConfig(provider)?.models || [];
  }
}

/**
 * 获取 Ollama 本地模型列表
 */
async function fetchOllamaModels(baseUrl: string): Promise<ModelInfo[]> {
  const response = await fetch(`${baseUrl}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error("Ollama 服务未运行");
  }

  const data = await response.json();
  const models = data.models || [];

  return models.map((m: { name: string; size: number; modified_at: string }) => ({
    id: m.name,
    name: m.name,
    description: formatSize(m.size),
    isFree: true,
  }));
}

/**
 * 获取 OpenAI 模型列表
 */
async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  if (!apiKey) {
    return getProviderConfig("openai")?.models || [];
  }

  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();

  // 过滤出聊天模型
  const chatModels = (data.data || [])
    .filter(
      (m: { id: string }) => m.id.includes("gpt") || m.id.includes("o1") || m.id.includes("chatgpt")
    )
    .filter(
      (m: { id: string }) =>
        !m.id.includes("instruct") &&
        !m.id.includes("vision") &&
        !m.id.includes("audio") &&
        !m.id.includes("realtime") &&
        !m.id.includes("embedding")
    )
    .map((m: { id: string; created: number }) => ({
      id: m.id,
      name: formatModelName(m.id),
      description: getOpenAIModelDescription(m.id),
    }))
    .sort((a: ModelInfo, b: ModelInfo) => {
      // 优先显示最新模型
      const order = ["gpt-4o", "o1", "gpt-4", "gpt-3.5"];
      const aOrder = order.findIndex((o) => a.id.includes(o));
      const bOrder = order.findIndex((o) => b.id.includes(o));
      return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder);
    });

  return chatModels.slice(0, 15); // 限制数量
}

/**
 * 获取 Google Gemini 模型列表
 */
async function fetchGoogleModels(apiKey: string): Promise<ModelInfo[]> {
  if (!apiKey) {
    return getProviderConfig("google")?.models || [];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { signal: AbortSignal.timeout(10000) }
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = await response.json();

  // 过滤出支持 generateContent 的模型
  const chatModels = (data.models || [])
    .filter((m: { supportedGenerationMethods: string[] }) =>
      m.supportedGenerationMethods?.includes("generateContent")
    )
    .filter((m: { name: string }) => m.name.includes("gemini"))
    .map((m: { name: string; displayName: string; description: string }) => ({
      id: m.name.replace("models/", ""),
      name: m.displayName || m.name,
      description: m.description?.slice(0, 50) || "",
    }));

  return chatModels;
}

/**
 * 获取 Groq 模型列表
 */
async function fetchGroqModels(apiKey: string): Promise<ModelInfo[]> {
  if (!apiKey) {
    return getProviderConfig("groq")?.models || [];
  }

  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.data || []).map((m: { id: string; context_window?: number }) => ({
    id: m.id,
    name: formatModelName(m.id),
    contextLength: m.context_window,
  }));
}

/**
 * 获取 Together AI 模型列表
 */
async function fetchTogetherModels(apiKey: string): Promise<ModelInfo[]> {
  if (!apiKey) {
    return getProviderConfig("together")?.models || [];
  }

  const response = await fetch("https://api.together.xyz/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Together API error: ${response.status}`);
  }

  const data = await response.json();

  // 过滤出聊天模型
  const chatModels = (data || [])
    .filter((m: { type: string }) => m.type === "chat")
    .map((m: { id: string; display_name?: string; context_length?: number }) => ({
      id: m.id,
      name: m.display_name || formatModelName(m.id),
      contextLength: m.context_length,
    }))
    .slice(0, 30);

  return chatModels;
}

/**
 * 获取 OpenRouter 模型列表
 */
async function fetchOpenRouterModels(apiKey: string): Promise<ModelInfo[]> {
  // OpenRouter 的模型列表是公开的
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();

  // 按定价排序，免费的在前面
  const models = (data.data || [])
    .map(
      (m: {
        id: string;
        name: string;
        context_length?: number;
        pricing?: { prompt: string; completion: string };
      }) => {
        const inputPrice = parseFloat(m.pricing?.prompt || "0") * 1000000;
        const outputPrice = parseFloat(m.pricing?.completion || "0") * 1000000;
        const isFree = inputPrice === 0 && outputPrice === 0;

        return {
          id: m.id,
          name: m.name,
          contextLength: m.context_length,
          isFree,
          pricing: isFree
            ? undefined
            : {
                input: Math.round(inputPrice * 100) / 100,
                output: Math.round(outputPrice * 100) / 100,
              },
        };
      }
    )
    .sort((a: ModelInfo, b: ModelInfo) => {
      // 免费模型排前面
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return 0;
    });

  return models.slice(0, 50); // 限制数量
}

/**
 * 获取 OpenAI 兼容服务商的模型列表
 */
async function fetchOpenAICompatibleModels(
  provider: LLMProvider,
  apiKey: string,
  customBaseUrl?: string
): Promise<ModelInfo[]> {
  const providerConfig = getProviderConfig(provider);
  const baseUrl = customBaseUrl || providerConfig?.baseUrl;

  if (!baseUrl || !apiKey) {
    return providerConfig?.models || [];
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // 某些服务商可能不支持 /models 端点
      console.log(`[ModelConfig] ${provider} /models not available, using defaults`);
      return providerConfig?.models || [];
    }

    const data = await response.json();

    return (data.data || data.models || []).map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name || formatModelName(m.id),
    }));
  } catch (error) {
    console.error(`[ModelConfig] Failed to fetch models for ${provider}:`, error);
    // 返回预定义列表
    return providerConfig?.models || [];
  }
}

// ========== 辅助函数 ==========

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function formatModelName(id: string): string {
  return id
    .replace(/^(accounts\/[^/]+\/models\/|models\/)/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getOpenAIModelDescription(id: string): string {
  if (id.includes("gpt-4o-mini")) return "性价比高";
  if (id.includes("gpt-4o")) return "最新旗舰";
  if (id.includes("o1-mini")) return "轻量推理";
  if (id.includes("o1")) return "深度推理";
  if (id.includes("gpt-4-turbo")) return "快速版";
  if (id.includes("gpt-4")) return "强大稳定";
  if (id.includes("gpt-3.5")) return "经济实惠";
  return "";
}
