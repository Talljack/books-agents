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

const levelOptions = [
  { value: "beginner", label: "入门", description: "零基础或刚开始学习" },
  { value: "intermediate", label: "进阶", description: "有一定基础，想深入学习" },
  { value: "advanced", label: "高级", description: "有丰富经验，想精通" },
] as const;

const languageOptions = [
  { value: "zh", label: "中文", description: "优先显示中文书籍" },
  { value: "en", label: "英文", description: "优先显示英文书籍" },
  { value: "any", label: "不限", description: "显示所有语言" },
] as const;

export function IntentConfirmation({
  preferences,
  understandingText,
  onConfirm,
  onCancel,
  onAdjust,
  isLoading,
}: IntentConfirmationProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const handleLevelChange = (level: typeof localPrefs.level) => {
    const levelLabel = levelOptions.find((o) => o.value === level)?.label || "入门";
    const updated = { ...localPrefs, level, levelLabel };
    setLocalPrefs(updated);
    onAdjust({ level, levelLabel });
  };

  const handleLanguageChange = (language: typeof localPrefs.language) => {
    const languageLabel = languageOptions.find((o) => o.value === language)?.label || "中文";
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
          <h3 className="text-sm font-medium">我理解您的需求</h3>
          <p className="text-xs text-muted-foreground">请确认或调整搜索条件</p>
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
              {languageOptions.find((o) => o.value === localPrefs.language)?.label}书籍
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
          取消
        </Button>
        <Button
          size="sm"
          onClick={() => onConfirm(localPrefs)}
          disabled={isLoading}
          className="gap-1"
        >
          <Search className="h-4 w-4" />
          {isLoading ? "搜索中..." : "确认搜索"}
        </Button>
      </div>
    </motion.div>
  );
}
