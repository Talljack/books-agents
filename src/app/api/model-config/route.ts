import { NextRequest, NextResponse } from "next/server";
import { UserModelConfig, PROVIDERS, getProviderConfig } from "@/types/model-config";

/**
 * GET /api/model-config
 * 获取可用的模型服务商和模型列表
 */
export async function GET() {
  return NextResponse.json({
    providers: PROVIDERS,
  });
}

/**
 * POST /api/model-config/test
 * 测试模型配置是否有效
 */
export async function POST(request: NextRequest) {
  try {
    const config: UserModelConfig = await request.json();
    
    // 验证配置
    const provider = getProviderConfig(config.provider);
    if (!provider) {
      return NextResponse.json(
        { success: false, error: "未知的服务商" },
        { status: 400 }
      );
    }

    // 如果需要 API Key 但没有提供
    if (provider.requiresApiKey && !config.apiKey) {
      return NextResponse.json(
        { success: false, error: "此服务商需要 API Key" },
        { status: 400 }
      );
    }

    // 测试连接
    const testResult = await testModelConnection(config);
    
    return NextResponse.json(testResult);
  } catch (error) {
    console.error("[ModelConfig] Test error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "测试失败" },
      { status: 500 }
    );
  }
}

/**
 * 测试模型连接
 */
async function testModelConnection(config: UserModelConfig): Promise<{ success: boolean; error?: string; latency?: number }> {
  
  try {
    switch (config.provider) {
      case "ollama":
        return await testOllama(config);
      case "openai":
        return await testOpenAI(config);
      case "anthropic":
        return await testAnthropic(config);
      case "openrouter":
        return await testOpenRouter(config);
      case "deepseek":
      case "moonshot":
      case "zhipu":
      case "custom":
        return await testOpenAICompatible(config);
      default:
        return { success: false, error: "不支持的服务商" };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "连接失败" 
    };
  }
}

/**
 * 测试 Ollama 连接
 */
async function testOllama(config: UserModelConfig): Promise<{ success: boolean; error?: string; latency?: number; models?: string[] }> {
  const baseUrl = config.ollamaHost || config.baseUrl || "http://localhost:11434";
  const startTime = Date.now();
  
  try {
    // 先检查服务是否运行
    const tagsResponse = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    
    if (!tagsResponse.ok) {
      return { success: false, error: "Ollama 服务未运行" };
    }
    
    const tagsData = await tagsResponse.json();
    const availableModels = tagsData.models?.map((m: { name: string }) => m.name) || [];
    
    // 检查指定模型是否存在
    if (config.model && !availableModels.some((m: string) => m.includes(config.model.split(":")[0]))) {
      return { 
        success: false, 
        error: `模型 ${config.model} 未安装。可用模型: ${availableModels.join(", ")}`,
        models: availableModels,
      };
    }
    
    // 测试生成
    const generateResponse = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model || "llama3.2:latest",
        prompt: "Say 'OK' in one word.",
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!generateResponse.ok) {
      const error = await generateResponse.text();
      return { success: false, error: `生成测试失败: ${error}` };
    }
    
    const latency = Date.now() - startTime;
    return { success: true, latency, models: availableModels };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { success: false, error: "连接超时，请检查 Ollama 是否运行" };
    }
    return { success: false, error: error instanceof Error ? error.message : "连接失败" };
  }
}

/**
 * 测试 OpenAI 连接
 */
async function testOpenAI(config: UserModelConfig): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now();
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.error?.message || `API 错误: ${response.status}` };
    }
    
    const latency = Date.now() - startTime;
    return { success: true, latency };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "连接失败" };
  }
}

/**
 * 测试 Anthropic 连接
 */
async function testAnthropic(config: UserModelConfig): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now();
  
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || "claude-3-haiku-20240307",
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.error?.message || `API 错误: ${response.status}` };
    }
    
    const latency = Date.now() - startTime;
    return { success: true, latency };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "连接失败" };
  }
}

/**
 * 测试 OpenRouter 连接
 */
async function testOpenRouter(config: UserModelConfig): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now();
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "BookFinder AI",
      },
      body: JSON.stringify({
        model: config.model || "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.error?.message || `API 错误: ${response.status}` };
    }
    
    const latency = Date.now() - startTime;
    return { success: true, latency };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "连接失败" };
  }
}

/**
 * 测试 OpenAI 兼容接口（DeepSeek, Moonshot, 智谱等）
 */
async function testOpenAICompatible(config: UserModelConfig): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now();
  const provider = getProviderConfig(config.provider);
  const baseUrl = config.baseUrl || provider?.baseUrl;
  
  if (!baseUrl) {
    return { success: false, error: "未配置 API 地址" };
  }
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.error?.message || `API 错误: ${response.status}` };
    }
    
    const latency = Date.now() - startTime;
    return { success: true, latency };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "连接失败" };
  }
}

