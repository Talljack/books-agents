/**
 * 豆瓣图书 API
 * 提供中文书籍评分和评价信息
 * 注意：官方 API 已废弃，使用公开搜索接口
 */

import { Book, SearchResult } from "@/types/book";

// 豆瓣搜索建议 API（公开）
const DOUBAN_SUGGEST_API = "https://book.douban.com/j/subject_suggest";

interface DoubanSuggestItem {
  id: string;
  title: string;
  url: string;
  pic: string;
  author_name: string;
  year: string;
  type: string;
}

/**
 * 将豆瓣搜索结果转换为统一的 Book 格式
 */
function doubanItemToBook(item: DoubanSuggestItem): Book {
  return {
    id: `douban_${item.id}`,
    title: item.title,
    authors: item.author_name ? [item.author_name] : ["Unknown Author"],
    publishedDate: item.year,
    thumbnail: item.pic?.replace("s_ratio", "l") || undefined, // 获取大图
    infoLink: item.url,
    doubanUrl: item.url,
    previewLink: item.url,
    source: "douban",
    language: "zh-CN",
  };
}

/**
 * 检测是否为小说类查询
 */
function isFictionQuery(query: string): boolean {
  const fictionKeywords = [
    "小说", "文学", "故事", "科幻", "奇幻", "悬疑", "推理", "言情", "武侠", "玄幻",
    "fiction", "novel", "story"
  ];
  return fictionKeywords.some(k => query.includes(k));
}

/**
 * 优化搜索查询词
 * 豆瓣 suggest API 对短查询效果更好
 */
function optimizeDoubanQuery(query: string): string[] {
  // 生成多个搜索变体
  const queries: string[] = [];
  const isFiction = isFictionQuery(query);
  
  // 原始查询（去掉过长的部分）
  const words = query.split(/\s+/).filter(w => w.length > 0);
  
  // 过滤掉修饰性词汇，保留核心主题词
  const modifierWords = ["热门", "推荐", "经典", "入门", "进阶", "高级", "实战", "教程", "指南", "最新", "畅销"];
  const coreWords = words.filter(w => !modifierWords.includes(w));
  
  // 如果有具体书名提及（如《三体》），提取书名 - 最高优先级
  const bookNameMatch = query.match(/《([^》]+)》/);
  if (bookNameMatch) {
    queries.push(bookNameMatch[1]);
  }
  
  // 对于小说类查询，添加特定的搜索策略
  if (isFiction) {
    // 科幻小说特殊处理
    if (query.includes("科幻")) {
      queries.push("科幻");
      queries.push("刘慈欣"); // 知名科幻作家
      queries.push("阿西莫夫");
      queries.push("银河帝国");
    }
    // 悬疑推理
    if (query.includes("悬疑") || query.includes("推理")) {
      queries.push("推理");
      queries.push("东野圭吾");
      queries.push("阿加莎");
    }
    // 武侠
    if (query.includes("武侠")) {
      queries.push("武侠");
      queries.push("金庸");
      queries.push("古龙");
    }
    // 奇幻/玄幻
    if (query.includes("奇幻") || query.includes("玄幻")) {
      queries.push("奇幻");
      queries.push("玄幻");
    }
  }
  
  // 合并核心词（如 "科幻" + "小说" -> "科幻小说"）
  if (coreWords.length >= 2) {
    queries.push(coreWords.slice(0, 2).join(""));
  }
  
  // 单独的核心词
  for (const word of coreWords.slice(0, 2)) {
    if (word.length >= 2) {
      queries.push(word);
    }
  }
  
  // 去重并限制数量
  const uniqueQueries = [...new Set(queries)].filter(q => q.length >= 2).slice(0, 6);
  console.log(`[Douban] Generated search variants:`, uniqueQueries);
  return uniqueQueries;
}

/**
 * 使用豆瓣搜索建议 API 搜索书籍
 * @param query 搜索关键词
 * @param maxResults 最大结果数
 */
export async function searchDoubanBooks(
  query: string,
  maxResults: number = 10
): Promise<SearchResult> {
  try {
    // 优化查询词，生成多个搜索变体
    const searchQueries = optimizeDoubanQuery(query);
    console.log(`[Douban] Optimized queries:`, searchQueries);
    
    const allBooks: Book[] = [];
    const seenIds = new Set<string>();
    
    // 对每个查询变体进行搜索
    for (const q of searchQueries) {
      if (allBooks.length >= maxResults) break;
      
      const params = new URLSearchParams({
        q: q,
      });

      const response = await fetch(`${DOUBAN_SUGGEST_API}?${params.toString()}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Referer: "https://book.douban.com/",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`[Douban] API error for "${q}": ${response.status}`);
        continue;
      }

      const data: DoubanSuggestItem[] = await response.json();

      // 只保留书籍类型，去重
      const bookItems = data.filter((item) => item.type === "b");
      for (const item of bookItems) {
        if (!seenIds.has(item.id) && allBooks.length < maxResults) {
          seenIds.add(item.id);
          allBooks.push(doubanItemToBook(item));
        }
      }
      
      console.log(`[Douban] Found ${bookItems.length} books for "${q}"`);
    }

    console.log(`[Douban] Total unique books: ${allBooks.length}`);

    return {
      books: allBooks,
      totalItems: allBooks.length,
      query,
    };
  } catch (error) {
    console.error("[Douban] Search error:", error);
    return {
      books: [],
      totalItems: 0,
      query,
    };
  }
}

/**
 * 获取豆瓣书籍详细信息（包括评分）
 * 通过解析页面获取评分信息
 * @param doubanId 豆瓣书籍 ID
 */
export async function getDoubanBookRating(
  doubanId: string
): Promise<{ rating: number; ratingCount: number } | null> {
  try {
    const url = `https://book.douban.com/subject/${doubanId}/`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // 从 HTML 中提取评分（简单正则匹配）
    const ratingMatch = html.match(
      /<strong class="ll rating_num"[^>]*>([0-9.]+)<\/strong>/
    );
    const countMatch = html.match(
      /<span property="v:votes">([0-9]+)<\/span>/
    );

    if (ratingMatch) {
      return {
        rating: parseFloat(ratingMatch[1]),
        ratingCount: countMatch ? parseInt(countMatch[1]) : 0,
      };
    }

    return null;
  } catch (error) {
    console.error("[Douban] Rating fetch error:", error);
    return null;
  }
}

/**
 * 检测查询语言是否为中文
 */
export function isChineseQuery(query: string): boolean {
  // 检查是否包含中文字符
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(query);
}

/**
 * 增强书籍信息：为已有书籍添加豆瓣评分
 * @param books 书籍列表
 * @param query 搜索关键词
 */
export async function enrichBooksWithDouban(
  books: Book[],
  query: string
): Promise<Book[]> {
  // 只有中文查询才搜索豆瓣
  if (!isChineseQuery(query)) {
    return books;
  }

  try {
    const doubanResult = await searchDoubanBooks(query, 5);

    // 尝试匹配并添加豆瓣信息
    return books.map((book) => {
      // 在豆瓣结果中查找匹配的书籍
      const doubanMatch = doubanResult.books.find((db) => {
        const titleMatch =
          db.title.includes(book.title) || book.title.includes(db.title);
        const authorMatch = book.authors.some(
          (author) =>
            db.authors.some((da) => da.includes(author) || author.includes(da))
        );
        return titleMatch || authorMatch;
      });

      if (doubanMatch) {
        return {
          ...book,
          doubanUrl: doubanMatch.doubanUrl,
          // 如果原书没有封面，使用豆瓣封面
          thumbnail: book.thumbnail || doubanMatch.thumbnail,
        };
      }

      return book;
    });
  } catch (error) {
    console.error("[Douban] Enrich error:", error);
    return books;
  }
}
