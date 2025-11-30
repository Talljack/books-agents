import { AgentState, Book } from "@/types/book";
import { searchGoogleBooks } from "@/lib/api/google-books";
import { searchOpenLibrary } from "@/lib/api/open-library";
import { searchDoubanBooks, isChineseQuery } from "@/lib/api/douban";

/**
 * 检测书籍语言
 */
function detectBookLanguage(book: Book): "zh" | "en" | "mixed" {
  const title = book.title || "";
  const chineseChars = (title.match(/[\u4e00-\u9fff]/g) || []).length;
  
  if (chineseChars > 0) {
    return "zh";
  }
  
  const englishChars = (title.match(/[a-zA-Z]/g) || []).length;
  if (englishChars > 0) {
    return "en";
  }
  
  return "mixed";
}

/**
 * 提取关键词
 */
function extractKeywords(query: string): string[] {
  // 移除常见停用词
  const stopWords = new Set([
    "的", "是", "了", "在", "和", "与", "或", "有", "这", "那", "什么", "怎么", "如何",
    "一些", "一本", "几本", "推荐", "书籍", "书", "好", "最", "想", "找", "要",
    "the", "a", "an", "is", "are", "of", "to", "in", "for", "on", "with", "about",
    "book", "books", "recommend", "want", "find", "some", "best", "good"
  ]);
  
  // 分词
  const words = query.toLowerCase()
    .replace(/[，。！？、；：""''（）【】《》]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));
  
  return [...new Set(words)];
}

/**
 * 计算相关性评分
 */
function calculateRelevanceScore(
  book: Book, 
  keywords: string[],
  languagePreference: "zh" | "en" | "any"
): number {
  let score = 0;
  
  const title = (book.title || "").toLowerCase();
  const description = (book.description || "").toLowerCase();
  const bookLang = detectBookLanguage(book);
  
  // 语言匹配
  if (languagePreference === "zh" && bookLang === "en") {
    return -1000;
  }
  if (languagePreference === "en" && bookLang === "zh") {
    return -1000;
  }
  
  // 关键词匹配
  let titleMatchCount = 0;
  let descMatchCount = 0;
  
  for (const keyword of keywords) {
    if (keyword.length < 2) continue;
    
    if (title.includes(keyword)) {
      score += Math.max(30, keyword.length * 10);
      titleMatchCount++;
    } else if (description.includes(keyword)) {
      score += Math.max(10, keyword.length * 3);
      descMatchCount++;
    }
  }
  
  // 覆盖率加成
  if (keywords.length > 0) {
    const matchRate = (titleMatchCount + descMatchCount) / keywords.length;
    score += Math.floor(matchRate * 50);
  }
  
  if (titleMatchCount >= 2) {
    score += 30;
  }
  
  // 无匹配惩罚
  if (titleMatchCount === 0 && descMatchCount === 0) {
    if (book.source === "douban") {
      score -= 10;
    } else {
      score -= 50;
    }
  }
  
  // 书籍质量分
  if (book.authors?.length > 0 && book.authors[0] !== "Unknown Author") {
    score += 5;
  }
  if (book.thumbnail && !book.thumbnail.includes("placeholder")) {
    score += 5;
  }
  if (book.averageRating && book.averageRating > 0) {
    score += Math.min(book.averageRating * 2, 10);
  }
  if (book.ratingsCount && book.ratingsCount > 100) {
    score += Math.min(Math.log10(book.ratingsCount) * 3, 15);
  }
  
  return score;
}

/**
 * 去重
 */
function deduplicateBooks(books: Book[]): Book[] {
  const seen = new Map<string, Book>();
  
  for (const book of books) {
    const normalizedTitle = book.title.toLowerCase()
      .replace(/[（(][^）)]*[）)]/g, "")
      .replace(/[:：].*$/, "")
      .replace(/\s+/g, "")
      .trim();
    
    const key = normalizedTitle.slice(0, 20);
    
    if (!seen.has(key)) {
      seen.set(key, book);
    } else {
      const existing = seen.get(key)!;
      // 保留信息更完整的
      const existingScore = (existing.description ? 1 : 0) + (existing.thumbnail ? 1 : 0) + (existing.averageRating ? 1 : 0);
      const newScore = (book.description ? 1 : 0) + (book.thumbnail ? 1 : 0) + (book.averageRating ? 1 : 0);
      if (newScore > existingScore) {
        seen.set(key, book);
      }
    }
  }
  
  return Array.from(seen.values());
}

export async function searchNode(state: AgentState): Promise<Partial<AgentState>> {
  const { query, filters } = state;

  try {
    const keywords = extractKeywords(query);
    const isChinese = isChineseQuery(query);
    const languagePreference: "zh" | "en" | "any" = isChinese ? "zh" : "any";
    
    console.log("[SearchNode] Query:", query);
    console.log("[SearchNode] Keywords:", keywords);
    console.log("[SearchNode] Language:", languagePreference);
    
    // 根据语言偏好调整搜索策略
    const searchPromises: Promise<{ books: Book[] }>[] = [];
    
    if (isChinese) {
      // 中文搜索：优先豆瓣
      searchPromises.push(
        searchDoubanBooks(query, 20).catch(() => ({ books: [] })),
        searchGoogleBooks(query, filters, 10).catch(() => ({ books: [], totalItems: 0, query })),
      );
    } else {
      // 英文搜索：优先 Google Books
      searchPromises.push(
        searchGoogleBooks(query, filters, 15).catch(() => ({ books: [], totalItems: 0, query })),
        searchOpenLibrary(query, 10).catch(() => ({ books: [], totalItems: 0, query })),
      );
    }
    
    const results = await Promise.all(searchPromises);
    const allBooks = results.flatMap(r => r.books);
    
    console.log("[SearchNode] Total books fetched:", allBooks.length);
    
    // 去重
    const uniqueBooks = deduplicateBooks(allBooks);
    console.log("[SearchNode] After dedup:", uniqueBooks.length);
    
    // 计算相关性评分并排序
    const scoredBooks = uniqueBooks.map(book => ({
      book,
      score: calculateRelevanceScore(book, keywords, languagePreference)
    }));
    
    // 过滤掉低分书籍
    const filteredBooks = scoredBooks
      .filter(({ score }) => score > -100)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ book }) => book);
    
    console.log("[SearchNode] Final results:", filteredBooks.length);

    return {
      books: filteredBooks,
      messages: [
        ...state.messages,
        {
          role: "assistant",
          content: `Found ${filteredBooks.length} books matching "${query}"`,
          timestamp: new Date(),
        },
      ],
    };
  } catch (error) {
    console.error("[SearchNode] Error:", error);
    return {
      error: error instanceof Error ? error.message : "Search failed",
      messages: [
        ...state.messages,
        {
          role: "assistant",
          content: "Sorry, there was an error searching for books. Please try again.",
          timestamp: new Date(),
        },
      ],
    };
  }
}
