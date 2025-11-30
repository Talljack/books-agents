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

export function PreferenceChips({ preferences, onAdjust, isLoading }: PreferenceChipsProps) {
  const [selectedLevel, setSelectedLevel] = useState(preferences.level);
  const [selectedLanguage, setSelectedLanguage] = useState(preferences.language);

  const handleLevelChange = (level: typeof selectedLevel) => {
    setSelectedLevel(level);
    const levelLabel = levelOptions.find((o) => o.value === level)?.label || "入门";
    onAdjust({ level, levelLabel });
  };

  const handleLanguageChange = (language: typeof selectedLanguage) => {
    setSelectedLanguage(language);
    const languageLabel = languageOptions.find((o) => o.value === language)?.label || "中文";
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
        <span>我理解你想找：</span>
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
              {levelOptions.find((o) => o.value === selectedLevel)?.label}
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
            {languageOptions.find((o) => o.value === selectedLanguage)?.label}书籍
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
              {selectedLanguage === option.value && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>重新搜索中...</span>
        </div>
      )}
    </motion.div>
  );
}
