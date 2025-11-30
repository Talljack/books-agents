/**
 * 豆瓣图书 API
 * 提供中文书籍评分和评价信息
 * 使用豆瓣移动端 rexxar API（更稳定，返回数据更丰富）
 */

import { Book, SearchResult } from "@/types/book";

// 豆瓣移动端搜索 API（更好用，返回更多数据）
const DOUBAN_REXXAR_API = "https://m.douban.com/rexxar/api/v2/search/subjects";

// 豆瓣搜索建议 API（备用）
const DOUBAN_SUGGEST_API = "https://book.douban.com/j/subject_suggest";

interface DoubanRexxarItem {
  layout: string;
  type_name: string;
  target_id: string;
  target_type: string;
  target: {
    rating: {
      count: number;
      max: number;
      star_count: number;
      value: number;
    };
    title: string;
    abstract?: string;
    uri: string;
    cover_url: string;
    has_ebook: boolean;
    card_subtitle: string; // 格式: "作者 / 年份 / 出版社"
    id: string;
    null_rating_reason?: string;
  };
}

interface DoubanRexxarResponse {
  subjects: {
    count: number;
    items: DoubanRexxarItem[];
    start: number;
    total: number;
  };
}

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
 * 解析 card_subtitle 获取作者、年份、出版社
 * 格式: "作者 / 年份 / 出版社" 或 "[国籍] 作者 / 年份 / 出版社"
 */
function parseCardSubtitle(subtitle: string): {
  authors: string[];
  year?: string;
  publisher?: string;
} {
  if (!subtitle) {
    return { authors: [] };
  }

  const parts = subtitle.split(" / ").map((p) => p.trim());
  const result: { authors: string[]; year?: string; publisher?: string } = {
    authors: [],
  };

  if (parts.length >= 1) {
    // 第一部分是作者，可能有多个作者用空格分隔
    const authorPart = parts[0];
    // 移除国籍标记如 [美]、[日]、（美）等
    const cleanAuthor = authorPart.replace(/[\[（\(][^\]）\)]+[\]）\)]\s*/g, "");
    result.authors = cleanAuthor
      .split(/\s+/)
      .filter((a) => a.length > 0)
      .slice(0, 3); // 最多取3个作者
  }

  if (parts.length >= 2) {
    // 第二部分通常是年份
    const yearPart = parts[1];
    if (/^\d{4}$/.test(yearPart)) {
      result.year = yearPart;
    }
  }

  if (parts.length >= 3) {
    // 第三部分是出版社
    result.publisher = parts[2];
  }

  return result;
}

/**
 * 将豆瓣 rexxar API 结果转换为统一的 Book 格式
 */
function rexxarItemToBook(item: DoubanRexxarItem): Book {
  const target = item.target;
  const parsed = parseCardSubtitle(target.card_subtitle);

  return {
    id: `douban_${target.id}`,
    title: target.title,
    authors: parsed.authors.length > 0 ? parsed.authors : ["Unknown Author"],
    description: target.abstract || undefined,
    publishedDate: parsed.year,
    publisher: parsed.publisher,
    thumbnail: target.cover_url?.replace("/m/", "/l/") || undefined, // 获取大图
    averageRating: target.rating?.value || undefined,
    ratingsCount: target.rating?.count || undefined,
    doubanRating: target.rating?.value || undefined,
    infoLink: `https://book.douban.com/subject/${target.id}/`,
    doubanUrl: `https://book.douban.com/subject/${target.id}/`,
    previewLink: `https://book.douban.com/subject/${target.id}/`,
    source: "douban",
    language: "zh-CN",
  };
}

/**
 * 将豆瓣 suggest API 结果转换为统一的 Book 格式（备用）
 */
function suggestItemToBook(item: DoubanSuggestItem): Book {
  return {
    id: `douban_${item.id}`,
    title: item.title,
    authors: item.author_name ? [item.author_name] : ["Unknown Author"],
    publishedDate: item.year,
    thumbnail: item.pic?.replace("s_ratio", "l") || undefined,
    infoLink: item.url,
    doubanUrl: item.url,
    previewLink: item.url,
    source: "douban",
    language: "zh-CN",
  };
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 使用豆瓣 rexxar API 搜索书籍（主要方法）
 * @param query 搜索关键词
 * @param maxResults 最大结果数
 * @param retries 重试次数
 */
async function searchWithRexxar(
  query: string,
  maxResults: number,
  retries: number = 2
): Promise<Book[]> {
  const params = new URLSearchParams({
    q: query,
    type: "book",
    count: String(Math.min(maxResults, 50)), // API 最多返回 50 条
    start: "0",
  });

  // 使用不同的 User-Agent 轮换
  const userAgents = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  ];

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ua = userAgents[attempt % userAgents.length];

      const response = await fetch(`${DOUBAN_REXXAR_API}?${params.toString()}`, {
        headers: {
          "User-Agent": ua,
          Referer: "https://m.douban.com/",
          Accept: "application/json",
        },
      });

      if (response.status === 403) {
        console.warn(`[Douban] Rexxar API returned 403, attempt ${attempt + 1}/${retries + 1}`);
        if (attempt < retries) {
          await delay(500 * (attempt + 1)); // 递增延迟
          continue;
        }
        throw new Error(`Rexxar API error: 403 (rate limited)`);
      }

      if (!response.ok) {
        throw new Error(`Rexxar API error: ${response.status}`);
      }

      const data: DoubanRexxarResponse = await response.json();

      if (!data.subjects?.items) {
        return [];
      }

      // 只保留书籍类型
      const bookItems = data.subjects.items.filter((item) => item.target_type === "book");

      return bookItems.map(rexxarItemToBook);
    } catch (error) {
      if (attempt < retries) {
        console.warn(`[Douban] Rexxar attempt ${attempt + 1} failed, retrying...`);
        await delay(500 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  return [];
}

/**
 * 使用豆瓣 suggest API 搜索书籍（备用方法）
 * @param query 搜索关键词
 * @param maxResults 最大结果数
 */
async function searchWithSuggest(query: string, maxResults: number): Promise<Book[]> {
  const params = new URLSearchParams({
    q: query,
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
    throw new Error(`Suggest API error: ${response.status}`);
  }

  const data: DoubanSuggestItem[] = await response.json();

  // 只保留书籍类型
  const bookItems = data.filter((item) => item.type === "b");

  return bookItems.slice(0, maxResults).map(suggestItemToBook);
}

/**
 * 搜索豆瓣书籍
 * 优先使用 rexxar API（数据更丰富），失败时回退到 suggest API
 * @param query 搜索关键词
 * @param maxResults 最大结果数
 */
export async function searchDoubanBooks(
  query: string,
  maxResults: number = 20
): Promise<SearchResult> {
  console.log(`[Douban] Searching for "${query}", max: ${maxResults}`);

  try {
    // 首先尝试 rexxar API
    let books = await searchWithRexxar(query, maxResults);
    console.log(`[Douban] Rexxar API returned ${books.length} books`);

    // 如果 rexxar 返回结果不足，尝试补充
    if (books.length < maxResults) {
      // 尝试用不同的查询变体搜索更多
      const additionalQueries = generateQueryVariants(query);
      const seenIds = new Set(books.map((b) => b.id));

      for (const q of additionalQueries) {
        if (books.length >= maxResults) break;

        try {
          const moreBooks = await searchWithRexxar(q, maxResults - books.length);
          for (const book of moreBooks) {
            if (!seenIds.has(book.id) && books.length < maxResults) {
              seenIds.add(book.id);
              books.push(book);
            }
          }
        } catch (e) {
          console.warn(`[Douban] Additional query "${q}" failed:`, e);
        }
      }
    }

    // 如果还是没有结果，尝试 suggest API 作为备用
    if (books.length === 0) {
      console.log(`[Douban] Falling back to suggest API`);
      try {
        books = await searchWithSuggest(query, maxResults);
        console.log(`[Douban] Suggest API returned ${books.length} books`);
      } catch (e) {
        console.warn(`[Douban] Suggest API also failed:`, e);
      }
    }

    console.log(`[Douban] Total books found: ${books.length}`);

    return {
      books,
      totalItems: books.length,
      query,
    };
  } catch (error) {
    console.error("[Douban] Search error:", error);

    // 主 API 失败，尝试备用
    try {
      console.log(`[Douban] Primary API failed, trying suggest API`);
      const books = await searchWithSuggest(query, maxResults);
      return {
        books,
        totalItems: books.length,
        query,
      };
    } catch (fallbackError) {
      console.error("[Douban] Fallback also failed:", fallbackError);
      return {
        books: [],
        totalItems: 0,
        query,
      };
    }
  }
}

/**
 * 生成查询变体以获取更多结果
 */
function generateQueryVariants(query: string): string[] {
  const variants: string[] = [];

  // 提取书名（如果有）
  const bookNameMatch = query.match(/《([^》]+)》/);
  if (bookNameMatch) {
    variants.push(bookNameMatch[1]);
  }

  // 分词后单独搜索
  const words = query.split(/\s+/).filter((w) => w.length >= 2 && !isModifierWord(w));
  for (const word of words.slice(0, 2)) {
    if (!variants.includes(word)) {
      variants.push(word);
    }
  }

  return variants;
}

/**
 * 检查是否为修饰性词汇
 */
function isModifierWord(word: string): boolean {
  const modifiers = [
    "热门",
    "推荐",
    "经典",
    "入门",
    "进阶",
    "高级",
    "实战",
    "教程",
    "指南",
    "最新",
    "畅销",
    "必读",
    "精选",
  ];
  return modifiers.includes(word);
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

    // 从 HTML 中提取评分
    const ratingMatch = html.match(/<strong class="ll rating_num"[^>]*>([0-9.]+)<\/strong>/);
    const countMatch = html.match(/<span property="v:votes">([0-9]+)<\/span>/);

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
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(query);
}

/**
 * 增强书籍信息：为已有书籍添加豆瓣评分
 * @param books 书籍列表
 * @param query 搜索关键词
 */
export async function enrichBooksWithDouban(books: Book[], query: string): Promise<Book[]> {
  // 只有中文查询才搜索豆瓣
  if (!isChineseQuery(query)) {
    return books;
  }

  try {
    const doubanResult = await searchDoubanBooks(query, 10);

    // 尝试匹配并添加豆瓣信息
    return books.map((book) => {
      // 在豆瓣结果中查找匹配的书籍
      const doubanMatch = doubanResult.books.find((db) => {
        const titleMatch = db.title.includes(book.title) || book.title.includes(db.title);
        const authorMatch = book.authors.some((author) =>
          db.authors.some((da) => da.includes(author) || author.includes(da))
        );
        return titleMatch || authorMatch;
      });

      if (doubanMatch) {
        return {
          ...book,
          doubanUrl: doubanMatch.doubanUrl,
          averageRating: doubanMatch.averageRating || book.averageRating,
          ratingsCount: doubanMatch.ratingsCount || book.ratingsCount,
          doubanRating: doubanMatch.doubanRating || book.doubanRating,
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
