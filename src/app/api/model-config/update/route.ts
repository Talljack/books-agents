import { NextRequest, NextResponse } from "next/server";
import { UserModelConfig } from "@/types/model-config";
import { setServerConfig, getCurrentConfig } from "@/lib/llm/factory";

/**
 * POST /api/model-config/update
 * 更新服务端的模型配置
 */
export async function POST(request: NextRequest) {
  try {
    const config: UserModelConfig = await request.json();

    // 更新 LLM 工厂配置
    setServerConfig(config);

    console.log("[ModelConfig] Updated config:", {
      provider: config.provider,
      model: config.model,
      hasApiKey: !!config.apiKey,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ModelConfig] Update error:", error);
    return NextResponse.json({ success: false, error: "更新失败" }, { status: 500 });
  }
}

/**
 * GET /api/model-config/update
 * 获取当前服务端配置
 */
export async function GET() {
  const config = getCurrentConfig();
  return NextResponse.json({
    config: {
      provider: config.provider,
      model: config.model,
      // 不返回 API Key
    },
  });
}
