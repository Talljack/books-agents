"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Search, Sparkles, X, Edit2 } from "lucide-react";
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

interface IntentConfirmationProps {
  preferences: InferredPreferences;
  understandingText: string;
  onConfirm: (preferences: InferredPreferences) => void;
  onCancel: () => void;
  onAdjust: (adjusted: Partial<InferredPreferences>) => void;
  isLoading?: boolean;
}

// 类型定义
type LevelValue = "beginner" | "intermediate" | "advanced";
type LanguageValue = "en" | "zh" | "any";

interface LevelOption {
  value: LevelValue;
  label: string;
  description: string;
}

interface LanguageOption {
  value: LanguageValue;
  label: string;
  description: string;
}

// 多语言配置
const i18n: {
  zh: { levelOptions: LevelOption[]; languageOptions: LanguageOption[]; ui: Record<string, string> };
  en: { levelOptions: LevelOption[]; languageOptions: LanguageOption[]; ui: Record<string, string> };
} = {
  zh: {
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
    ui: {
      title: "我理解您的需求",
      subtitle: "请确认或调整搜索条件",
      cancel: "取消",
      confirm: "确认搜索",
      searching: "搜索中...",
      books: "书籍",
    },
  },
  en: {
    levelOptions: [
      { value: "beginner", label: "Beginner", description: "Zero or little experience" },
      { value: "intermediate", label: "Intermediate", description: "Some experience, want to go deeper" },
      { value: "advanced", label: "Advanced", description: "Experienced, want to master" },
    ],
    languageOptions: [
      { value: "zh", label: "Chinese", description: "Prefer Chinese books" },
      { value: "en", label: "English", description: "Prefer English books" },
      { value: "any", label: "Any", description: "Show all languages" },
    ],
    ui: {
      title: "I understand your needs",
      subtitle: "Please confirm or adjust search criteria",
      cancel: "Cancel",
      confirm: "Confirm Search",
      searching: "Searching...",
      books: "books",
    },
  },
};

export function IntentConfirmation({
  preferences,
  understandingText,
  onConfirm,
  onCancel,
  onAdjust,
  isLoading,
}: IntentConfirmationProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);
  
  // 根据当前语言选择对应的文案
  const lang = localPrefs.language === "en" ? "en" : "zh";
  const t = i18n[lang];
  const levelOptions = t.levelOptions;
  const languageOptions = t.languageOptions;

  const handleLevelChange = (level: typeof localPrefs.level) => {
    const levelLabel = levelOptions.find((o) => o.value === level)?.label || levelOptions[0].label;
    const updated = { ...localPrefs, level, levelLabel };
    setLocalPrefs(updated);
    onAdjust({ level, levelLabel });
  };

  const handleLanguageChange = (language: typeof localPrefs.language) => {
    const newLang = language === "en" ? "en" : "zh";
    const newT = i18n[newLang];
    const languageLabel = newT.languageOptions.find((o) => o.value === language)?.label || newT.languageOptions[0].label;
    const updated = { ...localPrefs, language, languageLabel };
    setLocalPrefs(updated);
    onAdjust({ language, languageLabel });
  };

  const showLevelSelector = !preferences.isFiction;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="rounded-xl border bg-card p-4 shadow-lg"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium">{t.ui.title}</h3>
          <p className="text-xs text-muted-foreground">{t.ui.subtitle}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Understanding Text */}
      <div className="mb-4 rounded-lg bg-muted/50 p-3">
        <p className="text-sm">{understandingText}</p>
      </div>

      {/* Preference Chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Topic */}
        <Badge variant="secondary" className="gap-1 text-sm">
          <Edit2 className="h-3 w-3" />
          {localPrefs.topic}
        </Badge>

        {/* Level dropdown - only for non-fiction */}
        {showLevelSelector && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 gap-1 px-2 text-xs",
                  localPrefs.level !== preferences.level && "border-primary text-primary"
                )}
                disabled={isLoading}
              >
                {levelOptions.find((o) => o.value === localPrefs.level)?.label}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {levelOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleLevelChange(option.value)}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                  {localPrefs.level === option.value && <Check className="h-4 w-4 text-primary" />}
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
                "h-7 gap-1 px-2 text-xs",
                localPrefs.language !== preferences.language && "border-primary text-primary"
              )}
              disabled={isLoading}
            >
              {languageOptions.find((o) => o.value === localPrefs.language)?.label} {t.ui.books}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {languageOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleLanguageChange(option.value)}
                className="flex items-center gap-2"
              >
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
                {localPrefs.language === option.value && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
          {t.ui.cancel}
        </Button>
        <Button
          size="sm"
          onClick={() => onConfirm(localPrefs)}
          disabled={isLoading}
          className="gap-1"
        >
          <Search className="h-4 w-4" />
          {isLoading ? t.ui.searching : t.ui.confirm}
        </Button>
      </div>
    </motion.div>
  );
}
