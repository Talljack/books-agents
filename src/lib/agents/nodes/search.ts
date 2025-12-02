import { AgentState, Book } from "@/types/book";
import { searchGoogleBooks } from "@/lib/api/google-books";
import { searchOpenLibrary } from "@/lib/api/open-library";
import { searchDoubanBooks, isChineseQuery } from "@/lib/api/douban";
import { createLLM } from "@/lib/llm/factory";

// 简单的内存缓存（5分钟过期）
const searchCache = new Map<string, { books: Book[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

function getCachedResults(query: string): Book[] | null {
  const cached = searchCache.get(query.toLowerCase().trim());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("[SearchNode] Cache hit for:", query);
    return cached.books;
  }
  return null;
}

function setCachedResults(query: string, books: Book[]) {
  searchCache.set(query.toLowerCase().trim(), {
    books,
    timestamp: Date.now(),
  });
  
  // 清理过期缓存
  if (searchCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of searchCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        searchCache.delete(key);
      }
    }
  }
}

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
/**
 * 使用 LLM 提取搜索关键词
 */
async function extractKeywordsWithLLM(query: string): Promise<string[]> {
  try {
    const llm = createLLM();
    
    const prompt = `从用户的查询中提取用于图书搜索的关键词。

用户查询: "${query}"

要求:
1. 提取最核心的主题词（如：AI、JavaScript、心理学）
2. 去除无意义的词（如：我想、推荐、找、书籍）
3. 保留重要的限定词（如：入门、高级、实战）
4. 如果是中文查询，也提取对应的英文关键词
5. 返回 JSON 格式: {"keywords": ["关键词1", "关键词2"]}

示例:
- "我想找一些AI热门书籍" → {"keywords": ["AI", "artificial intelligence"]}
- "推荐JavaScript入门书" → {"keywords": ["JavaScript", "入门", "beginner"]}
- "心理学经典著作" → {"keywords": ["心理学", "psychology", "经典", "classic"]}

只返回 JSON，不要其他内容。`;

    const response = await llm.invoke([
      { role: "user", content: prompt }
    ]);
    
    const content = response.content.toString().trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const keywords = result.keywords || [];
      console.log("[LLM] Extracted keywords:", keywords);
      return keywords;
    }
    
    // 降级：简单分词
    console.warn("[LLM] Failed to parse, fallback to simple extraction");
    return fallbackExtractKeywords(query);
  } catch (error) {
    console.error("[LLM] Keyword extraction failed:", error);
    return fallbackExtractKeywords(query);
  }
}

/**
 * 降级方案：简单的关键词提取
 */
function fallbackExtractKeywords(query: string): string[] {
  const stopWords = new Set([
    "的", "是", "了", "在", "和", "与", "或", "有", "这", "那",
    "什么", "怎么", "如何", "一些", "一本", "几本", "推荐", "书籍", "书",
    "好", "最", "想", "找", "要", "我", "给", "帮", "请", "能", "可以",
    "the", "a", "an", "is", "are", "of", "to", "in", "for", "on",
    "with", "about", "book", "books", "recommend", "want", "find", "some",
  ]);

  const words = query
    .toLowerCase()
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

  // 无匹配严重惩罚
  if (titleMatchCount === 0 && descMatchCount === 0) {
    return -1000; // 完全不相关的书直接过滤
  }
  
  // 标题无匹配但描述有匹配，降低分数
  if (titleMatchCount === 0 && descMatchCount > 0) {
    score -= 30;
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
 * 检查书籍质量（基于统计特征，不用硬编码规则）
 */
function isValidBook(book: Book): boolean {
  const title = book.title || "";
  
  // 1. 检查乱码：问号比例过高
  const questionMarkRatio = (title.match(/\?/g) || []).length / Math.max(title.length, 1);
  if (questionMarkRatio > 0.3) {
    console.log(`[Filter] Rejected (garbled): ${title}`);
    return false;
  }
  
  // 2. 标题太短
  if (title.trim().length < 2) {
    console.log(`[Filter] Rejected (too short): ${title}`);
    return false;
  }
  
  // 3. 检查是否有基本的书籍信息
  const hasBasicInfo = book.authors?.length > 0 || book.publisher || book.publishedDate;
  const hasContent = book.description || book.pageCount;
  
  // 如果既没有基本信息也没有内容，可能是低质量数据
  if (!hasBasicInfo && !hasContent) {
    console.log(`[Filter] Rejected (no metadata): ${title}`);
    return false;
  }
  
  return true;
}

/**
 * 去重
 */
function deduplicateBooks(books: Book[]): Book[] {
  const seen = new Map<string, Book>();

  for (const book of books) {
    // 先检查质量
    if (!isValidBook(book)) {
      continue;
    }
    
    const normalizedTitle = book.title
      .toLowerCase()
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
      const existingScore =
        (existing.description ? 1 : 0) +
        (existing.thumbnail ? 1 : 0) +
        (existing.averageRating ? 1 : 0);
      const newScore =
        (book.description ? 1 : 0) + (book.thumbnail ? 1 : 0) + (book.averageRating ? 1 : 0);
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
    const startTime = Date.now();
    
    // 检查缓存
    const cachedBooks = getCachedResults(query);
    if (cachedBooks && cachedBooks.length > 0) {
      console.log(`[SearchNode] Returning ${cachedBooks.length} cached results`);
      return {
        books: cachedBooks,
        messages: [
          ...state.messages,
          {
            role: "assistant",
            content: `Found ${cachedBooks.length} books matching "${query}" (cached)`,
            timestamp: new Date(),
          },
        ],
      };
    }
    
    // 使用 LLM 提取关键词
    const keywords = await extractKeywordsWithLLM(query);
    const isChinese = isChineseQuery(query);
    const languagePreference: "zh" | "en" | "any" = isChinese ? "zh" : "any";

    console.log("[SearchNode] Query:", query);
    console.log("[SearchNode] Keywords:", keywords);
    console.log("[SearchNode] Language:", languagePreference);

    // 根据语言偏好调整搜索策略
    const searchPromises: Promise<{ books: Book[]; source: string; time?: number }>[] = [];

    if (isChinese) {
      // 中文搜索：优先豆瓣
      const doubanStart = Date.now();
      searchPromises.push(
        searchDoubanBooks(query, 20)
          .then((result) => ({ 
            ...result, 
            source: "douban",
            time: Date.now() - doubanStart 
          }))
          .catch(() => ({ books: [], source: "douban" }))
      );
      
      const googleStart = Date.now();
      searchPromises.push(
        searchGoogleBooks(query, filters, 10)
          .then((result) => ({ 
            ...result, 
            source: "google",
            time: Date.now() - googleStart 
          }))
          .catch(() => ({ books: [], totalItems: 0, query, source: "google" }))
      );
    } else {
      // 英文搜索：优先 Google Books
      const googleStart = Date.now();
      searchPromises.push(
        searchGoogleBooks(query, filters, 15)
          .then((result) => ({ 
            ...result, 
            source: "google",
            time: Date.now() - googleStart 
          }))
          .catch(() => ({ books: [], totalItems: 0, query, source: "google" }))
      );
      
      const openLibStart = Date.now();
      searchPromises.push(
        searchOpenLibrary(query, 10)
          .then((result) => ({ 
            ...result, 
            source: "openlibrary",
            time: Date.now() - openLibStart 
          }))
          .catch(() => ({ books: [], totalItems: 0, query, source: "openlibrary" }))
      );
    }

    const results = await Promise.all(searchPromises);
    
    // 性能日志
    results.forEach(({ source, books, time }) => {
      console.log(`[SearchNode] ${source}: ${books.length} books in ${time}ms`);
    });
    
    const allBooks = results.flatMap((r) => r.books);

    console.log("[SearchNode] Total books fetched:", allBooks.length);

    // 去重
    const uniqueBooks = deduplicateBooks(allBooks);
    console.log("[SearchNode] After dedup:", uniqueBooks.length);

    // 计算相关性评分并排序
    const scoredBooks = uniqueBooks.map((book) => ({
      book,
      score: calculateRelevanceScore(book, keywords, languagePreference),
    }));

    // 过滤掉低分书籍
    const filteredBooks = scoredBooks
      .filter(({ score }) => score > -100)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ book }) => book);

    const totalTime = Date.now() - startTime;
    console.log("[SearchNode] Final results:", filteredBooks.length);
    console.log(`[SearchNode] Total time: ${totalTime}ms`);

    // 缓存结果
    setCachedResults(query, filteredBooks);

    return {
      books: filteredBooks,
      messages: [
        ...state.messages,
        {
          role: "assistant",
          content: `Found ${filteredBooks.length} books matching "${query}" (${totalTime}ms)`,
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
