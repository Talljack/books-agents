import { NextRequest, NextResponse } from "next/server";
import { inferPreferencesWithLLM, type InferredPreferences } from "@/lib/agents";

/**
 * 意图分析 API - 仅分析用户意图，不执行搜索
 * 返回推断的偏好供用户确认/调整
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = (await request.json()) as {
      message: string;
    };

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    console.log("[Analyze] Received message:", message);

    // 使用 LLM 分析用户意图
    const inferredPreferences = await inferPreferencesWithLLM(message);

    console.log("[Analyze] Inferred preferences:", inferredPreferences);

    // 生成理解确认文本
    const understandingText = generateUnderstandingText(inferredPreferences);

    return NextResponse.json({
      success: true,
      inferredPreferences,
      understandingText,
      // 建议的搜索查询（供预览）
      suggestedQuery: buildPreviewQuery(inferredPreferences),
    });
  } catch (error) {
    console.error("[Analyze] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}

/**
 * 生成理解确认文本（多语言）
 */
function generateUnderstandingText(prefs: InferredPreferences): string {
  const isEnglish = prefs.language === "en";

  if (prefs.isFiction) {
    return isEnglish
      ? `I understand you're looking for ${prefs.languageLabel} books about ${prefs.topic}`
      : `我理解您想找 ${prefs.topic} 方面的${prefs.languageLabel}书籍`;
  }
  return isEnglish
    ? `I understand you're looking for ${prefs.levelLabel} level ${prefs.topic} books in ${prefs.languageLabel}`
    : `我理解您想找 ${prefs.levelLabel}级别的 ${prefs.topic} ${prefs.languageLabel}书籍`;
}

/**
 * 构建预览查询
 */
function buildPreviewQuery(prefs: InferredPreferences): string {
  const parts = [prefs.topic];

  if (!prefs.isFiction && prefs.level) {
    const levelKeywords: Record<string, string> = {
      beginner: prefs.language === "zh" ? "入门" : "beginner",
      intermediate: prefs.language === "zh" ? "进阶" : "intermediate",
      advanced: prefs.language === "zh" ? "高级" : "advanced",
    };
    parts.push(levelKeywords[prefs.level] || "");
  }

  return parts.filter(Boolean).join(" ");
}
