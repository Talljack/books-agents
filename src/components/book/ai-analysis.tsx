"use client";

import { BookAnalysis } from "@/types/book";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Target,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Users,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAnalysisProps {
  analysis: BookAnalysis | null;
  isLoading?: boolean;
  className?: string;
}

export function AIAnalysis({ analysis, isLoading, className }: AIAnalysisProps) {
  if (isLoading) {
    return <AIAnalysisSkeleton className={className} />;
  }

  if (!analysis) {
    return null;
  }

  const scoreColor =
    analysis.shouldRead.score >= 70
      ? "text-green-600"
      : analysis.shouldRead.score >= 40
        ? "text-yellow-600"
        : "text-red-600";

  const difficultyColor = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    advanced: "bg-red-100 text-red-800",
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Interest Score */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Should You Read This?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={cn("text-5xl font-bold", scoreColor)}>{analysis.shouldRead.score}</div>
            <div className="flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    analysis.shouldRead.score >= 70
                      ? "bg-green-500"
                      : analysis.shouldRead.score >= 40
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  )}
                  style={{ width: `${analysis.shouldRead.score}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {analysis.shouldRead.score >= 70
                  ? "Highly recommended for you!"
                  : analysis.shouldRead.score >= 40
                    ? "Might be worth checking out"
                    : "May not match your interests"}
              </p>
            </div>
          </div>

          {/* Reasons */}
          <div className="mt-4 space-y-2">
            {analysis.shouldRead.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {analysis.shouldRead.score >= 50 ? (
                  <ThumbsUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                ) : (
                  <ThumbsDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                )}
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-muted-foreground">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Themes & Target Audience */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Themes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5" />
              Key Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.themes.map((theme, i) => (
                <Badge key={i} variant="secondary">
                  {theme}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Target Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{analysis.targetAudience}</p>
            <Badge className={cn("mt-3", difficultyColor[analysis.difficulty])} variant="outline">
              <BarChart3 className="mr-1 h-3 w-3" />
              {analysis.difficulty.charAt(0).toUpperCase() + analysis.difficulty.slice(1)} Level
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Key Takeaways */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" />
            Key Takeaways
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{takeaway}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Similar Books */}
      {analysis.similarBooks && analysis.similarBooks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              Similar Books You Might Like
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.similarBooks.map((book, i) => (
                <Badge key={i} variant="outline">
                  {book}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AIAnalysisSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
