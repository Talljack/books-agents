import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchGoogleBooks } from "@/lib/api/google-books";
import { searchOpenLibrary } from "@/lib/api/open-library";
import { searchInternetArchive } from "@/lib/api/internet-archive";
import { searchDoubanBooks, isChineseQuery, enrichBooksWithDouban } from "@/lib/api/douban";
import { Book } from "@/types/book";

/**
 * 检测书籍语言
 * 返回 "zh" | "en" | "mixed"
 */
function detectBookLanguage(book: Book): "zh" | "en" | "mixed" {
  const title = book.title || "";
  const chineseChars = (title.match(/[\u4e00-\u9fff]/g) || []).length;
  
  // 只要有中文字符，就认为是中文书（或混合）
  if (chineseChars > 0) {
    return "zh";
  }
  
  // 没有中文字符，检查是否是纯英文
  const englishChars = (title.match(/[a-zA-Z]/g) || []).length;
  if (englishChars > 0) {
    return "en";
  }
  
  return "mixed";
}

/**
 * 计算两个字符串的相似度 (0-1)
 * 使用简化的 Jaccard 相似度
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // 完全匹配
  if (s1 === s2) return 1;
  
  // 包含关系
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }
  
  // 字符级别的 Jaccard 相似度
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * 通用相关性评分函数
 * 核心原则：纯粹基于关键词匹配，无任何硬编码
 * 
 * 评分逻辑：
 * 1. 语言必须匹配（用户选择的语言）
 * 2. 关键词在标题中匹配 = 高分
 * 3. 关键词在描述中匹配 = 中等分
 * 4. 匹配的关键词越多，分数越高
 * 5. 书籍信息完整度影响质量分
 */
function calculateRelevanceScore(
  book: Book, 
  query: string, 
  keywords: string[],
  languagePreference: string = "any"
): number {
  let score = 0;
  
  const title = (book.title || "").toLowerCase();
  const description = (book.description || "").toLowerCase();

  // ============ 1. 语言匹配（硬性要求） ============
  const bookLang = detectBookLanguage(book);
  
  if (languagePreference === "zh" && bookLang === "en") {
    return -1000; // 用户要中文，这是英文书，排除
  }
  if (languagePreference === "en" && bookLang === "zh") {
    return -1000; // 用户要英文，这是中文书，排除
  }
  
  // ============ 2. 关键词匹配（核心评分） ============
  let titleMatchCount = 0;
  let descMatchCount = 0;
  let totalMatchScore = 0;
  
  for (const keyword of keywords) {
    if (keyword.length < 2) continue;
    
    // 标题包含关键词（权重最高）
    if (title.includes(keyword)) {
      // 根据关键词长度给分，越长的词匹配越有价值
      const keywordScore = Math.max(30, keyword.length * 10);
      totalMatchScore += keywordScore;
      titleMatchCount++;
    }
    // 描述包含关键词
    else if (description.includes(keyword)) {
      const keywordScore = Math.max(10, keyword.length * 3);
      totalMatchScore += keywordScore;
      descMatchCount++;
    }
  }
  
  score += totalMatchScore;
  
  // ============ 3. 匹配覆盖率加成 ============
  // 如果用户搜索了多个关键词，匹配越多越好
  if (keywords.length > 0) {
    const matchRate = (titleMatchCount + descMatchCount) / keywords.length;
    score += Math.floor(matchRate * 50); // 覆盖率加成，最多50分
  }
  
  // 多关键词在标题中匹配，额外加分
  if (titleMatchCount >= 2) {
    score += 30;
  }
  
  // ============ 4. 无匹配惩罚 ============
  // 如果没有任何关键词匹配，这本书可能不相关
  // 但对于豆瓣来源的书，因为搜索已经做了过滤，惩罚较轻
  if (titleMatchCount === 0 && descMatchCount === 0) {
    if (book.source === "douban") {
      score -= 10; // 豆瓣搜索结果本身已经是相关的
    } else {
      score -= 50;
    }
  }
  
  // ============ 5. 书籍质量分（信息完整度） ============
  if (book.authors?.length > 0 && book.authors[0] !== "Unknown Author") {
    score += 5;
  }
  if (book.thumbnail && !book.thumbnail.includes("placeholder")) {
    score += 5;
  }
  if (book.publishedDate) {
    score += 2;
  }
  if (book.description && book.description.length > 50) {
    score += 3;
  }
  if (book.averageRating && book.averageRating > 0) {
    score += Math.min(book.averageRating * 2, 10);
  }
  
  // ============ 6. 数据源质量 ============
  // 豆瓣的中文书数据通常更准确
  if (book.source === "douban" && languagePreference === "zh") {
          score += 10;
  }

  return score;
}

/**
 * 搜索书籍工具
 * 使用 Function Calling 方式定义
 * 集成多个数据源，根据语言偏好动态调整配比
 * 目标返回 20 条高质量、最相关的结果
 */
export const searchBooksTool = tool(
  async ({ query, maxResults = 20, language }): Promise<Book[]> => {
    const queryHasChinese = isChineseQuery(query);
    
    // 直接使用查询词作为关键词（查询词已经是 LLM 提取的核心主题）
    // 按空格分割，每个词都是一个关键词
    const keywords = query.split(/\s+/).filter(w => w.length >= 2);

    console.log(`[Tool] Search query: "${query}"`);
    console.log(`[Tool] Keywords for scoring:`, keywords);
    console.log(`[Tool] Query has Chinese: ${queryHasChinese}, Language preference: ${language}`);
    console.log(`[Tool] Target results: ${maxResults}`);

    try {
      // 根据语言偏好动态调整数据源配比
      // 豆瓣新 API 可以返回更多数据，中文搜索优先使用豆瓣
      let googleRatio: number;
      let doubanRatio: number;
      let openLibraryRatio: number;
      
      if (language === "en") {
        // 英文优先：主要用 Google Books 和 Open Library
        googleRatio = 0.7;
        doubanRatio = 0;
        openLibraryRatio = 0.3;
      } else if (language === "zh") {
        // 中文优先：豆瓣为主（数据更准确），Google Books 为辅
        googleRatio = 0.4;
        doubanRatio = 0.6;
        openLibraryRatio = 0;
      } else {
        // 不限语言：混合搜索
        if (queryHasChinese) {
          googleRatio = 0.4;
          doubanRatio = 0.5;
          openLibraryRatio = 0.1;
        } else {
        googleRatio = 0.6;
        doubanRatio = 0.2;
        openLibraryRatio = 0.2;
        }
      }
      
      // 搜索时获取更多结果以便筛选（目标的5倍）
      const searchMultiplier = 5;
      const googleSearchMax = Math.ceil(maxResults * googleRatio * searchMultiplier);
      const doubanSearchMax = Math.ceil(maxResults * doubanRatio * searchMultiplier);
      const openLibrarySearchMax = Math.ceil(maxResults * openLibraryRatio * searchMultiplier);
      
      console.log(`[Tool] Source ratio - Google: ${googleRatio * 100}%, Douban: ${doubanRatio * 100}%, OpenLibrary: ${openLibraryRatio * 100}%`);

      // 构建搜索查询
      // 使用原始查询 + 关键词组合
      const searchQueries = [query];
      if (keywords.length > 1) {
        searchQueries.push(keywords.join(" "));
      }
      // 对于长查询，也尝试只用前几个关键词
      if (keywords.length > 3) {
        searchQueries.push(keywords.slice(0, 3).join(" "));
      }
      
      const uniqueQueries = [...new Set(searchQueries)].slice(0, 3);
      console.log(`[Tool] Search queries:`, uniqueQueries);

      // 设置语言过滤器
      const googleFilters = language === "zh" ? { language: "zh" } : 
                           language === "en" ? { language: "en" } : undefined;

      // Google Books 搜索
      const googlePromises = uniqueQueries.map(q => 
        searchGoogleBooks(q, googleFilters, Math.ceil(googleSearchMax / uniqueQueries.length)).catch((e) => {
          console.error(`[Tool] Google Books error for "${q}":`, e);
          return { books: [], total: 0 };
        })
      );

      // 其他数据源
      const otherPromises: Promise<{ books: Book[]; total?: number; source?: string }>[] = [];

      // 豆瓣搜索（中文书籍）
      if (doubanRatio > 0) {
        for (const q of uniqueQueries) {
          otherPromises.push(
            searchDoubanBooks(q, Math.ceil(doubanSearchMax / uniqueQueries.length))
              .then(r => ({ ...r, source: 'douban' }))
              .catch((e) => {
                console.error(`[Tool] Douban error for "${q}":`, e);
                return { books: [], totalItems: 0, query: q, source: 'douban' };
            })
          );
        }
      }

      // Open Library 搜索
      if (openLibraryRatio > 0) {
        // 对于中文查询，尝试用关键词的英文翻译或直接搜索
        const olQuery = queryHasChinese ? keywords.join(" ") : query;
        otherPromises.push(
          searchOpenLibrary(olQuery, openLibrarySearchMax)
            .then(r => ({ ...r, source: 'openlibrary' }))
            .catch((e) => {
            console.error("[Tool] Open Library error:", e);
            return { books: [], total: 0, source: 'openlibrary' };
          })
        );
      }

      // Internet Archive（设置超时）
      if (openLibraryRatio > 0) {
        const iaPromise = Promise.race([
          searchInternetArchive(query, openLibrarySearchMax).then(r => ({ ...r, source: 'internetarchive' })),
          new Promise<{ books: Book[]; totalItems: number; query: string; source: string }>((_, reject) => 
            setTimeout(() => reject(new Error('Internet Archive timeout')), 5000)
          )
        ]).catch((e) => {
          console.error("[Tool] Internet Archive error:", e.message || e);
          return { books: [], totalItems: 0, query: query, source: 'internetarchive' };
        });
        
        otherPromises.push(iaPromise);
      }

      // 并行执行所有搜索
      const [googleResults, otherResults] = await Promise.all([
        Promise.all(googlePromises),
        Promise.all(otherPromises)
      ]);

      // 合并所有结果
      let allBooks: Book[] = [];
      
      for (const result of googleResults) {
        if (result && result.books) {
          allBooks = [...allBooks, ...result.books];
        }
      }
      console.log(`[Tool] Google Books total found: ${allBooks.length} books`);

      const googleCount = allBooks.length;
      for (const result of otherResults) {
        if (result && result.books) {
          console.log(`[Tool] ${result.source || 'other'} found: ${result.books.length} books`);
          allBooks = [...allBooks, ...result.books];
        }
      }
      console.log(`[Tool] Other sources total found: ${allBooks.length - googleCount} books`);
      console.log(`[Tool] Total books from all sources: ${allBooks.length}`);

      // 去重（基于标题相似度）
      const seen = new Set<string>();
      const uniqueBooks = allBooks.filter((book) => {
        const normalizedTitle = book.title.toLowerCase()
          .replace(/[《》「」『』【】\[\]()（）:：]/g, '')
          .replace(/\s+/g, '');
        const key = `${normalizedTitle}-${book.authors.join(",").toLowerCase()}`;
        
        if (seen.has(key)) return false;
        
        // 检查标题是否太相似
        for (const existingKey of seen) {
          const existingTitle = existingKey.split('-')[0];
          if (existingTitle.length > 3 && normalizedTitle.length > 3) {
          if (existingTitle.includes(normalizedTitle) || normalizedTitle.includes(existingTitle)) {
              return false;
            }
          }
        }
        
        seen.add(key);
        return true;
      });

      console.log(`[Tool] After dedup: ${uniqueBooks.length} unique books`);

      // 计算相关性分数
      const scoredBooks = uniqueBooks.map((book) => ({
        book,
        score: calculateRelevanceScore(book, query, keywords, language),
      }));

      // 按分数排序
      scoredBooks.sort((a, b) => b.score - a.score);

      // 打印前 20 个书籍的分数用于调试
      console.log(`[Tool] Top 20 scored books:`);
      scoredBooks.slice(0, 20).forEach((item, i) => {
        console.log(`  ${i + 1}. "${item.book.title}" (${item.book.source}) - score: ${item.score}`);
      });

      // 分数过滤策略：
      // 1. 优先返回分数 > 0 的高相关书籍
      // 2. 如果不够，补充分数 > -30 的中等相关书籍
      // 3. 排除分数 < -500 的书籍（语言不匹配）
      let filteredBooks = scoredBooks
        .filter((item) => item.score > 0)
        .slice(0, maxResults)
        .map((item) => item.book);

      console.log(`[Tool] High relevance books (score > 0): ${filteredBooks.length}`);

      // 如果高相关书籍不够，补充一些中等相关的
      if (filteredBooks.length < maxResults) {
        const additionalBooks = scoredBooks
          .filter((item) => item.score > -30 && item.score <= 0)
          .slice(0, maxResults - filteredBooks.length)
          .map((item) => item.book);
        filteredBooks = [...filteredBooks, ...additionalBooks];
        console.log(`[Tool] After adding medium relevance: ${filteredBooks.length}`);
      }
      
      // 如果还是不够，再放宽到分数 > -100（但不包括语言不匹配的）
      if (filteredBooks.length < maxResults) {
        const moreBooks = scoredBooks
          .filter((item) => item.score > -100 && item.score <= -30)
          .slice(0, maxResults - filteredBooks.length)
          .map((item) => item.book);
        filteredBooks = [...filteredBooks, ...moreBooks];
        console.log(`[Tool] After adding lower relevance: ${filteredBooks.length}`);
      }
      
      console.log(`[Tool] Returning ${filteredBooks.length} books (target: ${maxResults})`);

      // 如果是中文查询，尝试为书籍添加豆瓣信息
      if (queryHasChinese && filteredBooks.length > 0) {
        filteredBooks = await enrichBooksWithDouban(filteredBooks, query);
      }

      // 标记可在线阅读的书籍
      filteredBooks = filteredBooks.map((book) => {
        if (book.source === "internetarchive" && !book.readOnlineLink) {
          book.readOnlineLink = book.previewLink;
        }
        return book;
      });

      console.log(`[Tool] Found ${uniqueBooks.length} unique, returning ${filteredBooks.length} relevant books`);

      return filteredBooks;
    } catch (error) {
      console.error("[Tool] Search error:", error);
      return [];
    }
  },
  {
    name: "search_books",
    description:
      "搜索书籍数据库，根据关键词查找相关书籍。当你已经收集到足够的用户偏好信息后，使用此工具搜索书籍。",
    schema: z.object({
      query: z.string().describe("搜索关键词，应该包含主题、难度级别等信息"),
      maxResults: z.number().optional().default(20).describe("返回的最大结果数，默认20"),
      language: z
        .enum(["en", "zh", "any"])
        .optional()
        .default("any")
        .describe("语言偏好"),
    }),
  }
);

/**
 * 分析用户偏好工具
 * 用于从用户消息中提取偏好信息
 */
export const analyzePreferencesTool = tool(
  async ({ topic, level, language, bookType, yearPreference }) => {
    return {
      preferences: {
        topic: topic || undefined,
        level: level || undefined,
        language: language || undefined,
        bookType: bookType || undefined,
        yearPreference: yearPreference || undefined,
      },
      extractedFields: [topic, level, language, bookType, yearPreference].filter(Boolean),
    };
  },
  {
    name: "analyze_preferences",
    description: "从用户的消息中提取书籍偏好信息",
    schema: z.object({
      topic: z
        .string()
        .optional()
        .describe("用户感兴趣的主题，如：机器学习、Web开发、数据科学"),
      level: z
        .enum(["beginner", "intermediate", "advanced"])
        .optional()
        .describe("用户的技术水平"),
      language: z.enum(["en", "zh", "any"]).optional().describe("语言偏好"),
      bookType: z
        .enum(["practical", "theoretical", "both"])
        .optional()
        .describe("书籍类型偏好"),
      yearPreference: z
        .enum(["latest", "classic", "any"])
        .optional()
        .describe("出版年份偏好"),
    }),
  }
);

// 导出所有工具
export const bookAgentTools = [searchBooksTool, analyzePreferencesTool];
