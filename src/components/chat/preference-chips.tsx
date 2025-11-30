"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface InferredPreferences {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  levelLabel: string;
  language: "en" | "zh" | "any";
  languageLabel: string;
  confidence: number;
  isFiction?: boolean;
}

interface PreferenceChipsProps {
  preferences: InferredPreferences;
  onAdjust: (adjusted: Partial<InferredPreferences>) => void;
  isLoading?: boolean;
}

// 多语言配置
const i18n = {
  zh: {
    lookingFor: "我理解你想找：",
    searching: "重新搜索中...",
    books: "书籍",
    levelOptions: [
      { value: "beginner", label: "入门", description: "零基础或刚开始学习" },
      { value: "intermediate", label: "进阶", description: "有一定基础，想深入学习" },
      { value: "advanced", label: "高级", description: "有丰富经验，想精通" },
    ],
    languageOptions: [
      { value: "zh", label: "中文", description: "优先显示中文书籍" },
      { value: "en", label: "英文", description: "优先显示英文书籍" },
      { value: "any", label: "不限", description: "显示所有语言" },
    ],
  },
  en: {
    lookingFor: "I understand you're looking for:",
    searching: "Searching...",
    books: "books",
    levelOptions: [
      { value: "beginner", label: "Beginner", description: "Zero or little experience" },
      {
        value: "intermediate",
        label: "Intermediate",
        description: "Some experience, want to go deeper",
      },
      { value: "advanced", label: "Advanced", description: "Experienced, want to master" },
    ],
    languageOptions: [
      { value: "zh", label: "Chinese", description: "Prefer Chinese books" },
      { value: "en", label: "English", description: "Prefer English books" },
      { value: "any", label: "Any", description: "Show all languages" },
    ],
  },
};

export function PreferenceChips({ preferences, onAdjust, isLoading }: PreferenceChipsProps) {
  const [selectedLevel, setSelectedLevel] = useState(preferences.level);
  const [selectedLanguage, setSelectedLanguage] = useState(preferences.language);

  // 根据语言偏好选择 UI 语言
  const lang = preferences.language === "en" ? "en" : "zh";
  const t = i18n[lang];

  const handleLevelChange = (level: typeof selectedLevel) => {
    setSelectedLevel(level);
    const levelLabel =
      t.levelOptions.find((o) => o.value === level)?.label || t.levelOptions[0].label;
    onAdjust({ level, levelLabel });
  };

  const handleLanguageChange = (language: typeof selectedLanguage) => {
    setSelectedLanguage(language);
    const newLang = language === "en" ? "en" : "zh";
    const newT = i18n[newLang];
    const languageLabel =
      newT.languageOptions.find((o) => o.value === language)?.label ||
      newT.languageOptions[0].label;
    onAdjust({ language, languageLabel });
  };

  // 是否显示难度选择器（文学类不显示）
  const showLevelSelector = !preferences.isFiction;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
    >
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>{t.lookingFor}</span>
      </div>

      {/* Topic chip - 不可编辑，只显示 */}
      <Badge variant="secondary" className="text-sm">
        {preferences.topic}
      </Badge>

      {/* Level dropdown - 只有技术类才显示 */}
      {showLevelSelector && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-6 gap-1 px-2 text-xs",
                selectedLevel !== preferences.level && "border-primary text-primary"
              )}
              disabled={isLoading}
            >
              {t.levelOptions.find((o) => o.value === selectedLevel)?.label}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {t.levelOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleLevelChange(option.value as typeof selectedLevel)}
                className="flex items-center gap-2"
              >
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
                {selectedLevel === option.value && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Language dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-6 gap-1 px-2 text-xs",
              selectedLanguage !== preferences.language && "border-primary text-primary"
            )}
            disabled={isLoading}
          >
            {t.languageOptions.find((o) => o.value === selectedLanguage)?.label} {t.books}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {t.languageOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleLanguageChange(option.value as typeof selectedLanguage)}
              className="flex items-center gap-2"
            >
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
              {selectedLanguage === option.value && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>{t.searching}</span>
        </div>
      )}
    </motion.div>
  );
}
