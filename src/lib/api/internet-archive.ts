/**
 * Internet Archive API
 * 提供免费在线阅读的公共领域书籍
 * API 文档: https://archive.org/developers/
 */

import { Book, SearchResult } from "@/types/book";

const IA_API_BASE = "https://archive.org/advancedsearch.php";

interface IADoc {
  identifier: string;
  title?: string;
  creator?: string | string[];
  description?: string | string[];
  date?: string;
  year?: string;
  publisher?: string | string[];
  language?: string | string[];
  subject?: string | string[];
  imagecount?: number;
  avg_rating?: number;
  num_reviews?: number;
}

interface IASearchResponse {
  response: {
    numFound: number;
    start: number;
    docs: IADoc[];
  };
}

/**
 * 将 Internet Archive 文档转换为统一的 Book 格式
 */
function iaDocToBook(doc: IADoc): Book {
  const identifier = doc.identifier;

  // 处理可能是数组的字段
  const getFirst = (value: string | string[] | undefined): string | undefined => {
    if (Array.isArray(value)) return value[0];
    return value;
  };

  const getAll = (value: string | string[] | undefined): string[] => {
    if (Array.isArray(value)) return value;
    if (value) return [value];
    return [];
  };

  return {
    id: `ia_${identifier}`,
    title: doc.title || "Unknown Title",
    authors: getAll(doc.creator).length > 0 ? getAll(doc.creator) : ["Unknown Author"],
    description: getFirst(doc.description),
    publishedDate: doc.year || doc.date,
    publisher: getFirst(doc.publisher),
    language: getFirst(doc.language),
    categories: getAll(doc.subject).slice(0, 5),
    pageCount: doc.imagecount,
    thumbnail: `https://archive.org/services/img/${identifier}`,
    previewLink: `https://archive.org/details/${identifier}`,
    infoLink: `https://archive.org/details/${identifier}`,
    // 在线阅读链接
    readOnlineLink: `https://archive.org/details/${identifier}/mode/2up`,
    averageRating: doc.avg_rating,
    ratingsCount: doc.num_reviews,
    source: "internetarchive",
  };
}

/**
 * 搜索 Internet Archive 书籍
 * @param query 搜索关键词
 * @param maxResults 最大结果数
 * @returns 搜索结果
 */
export async function searchInternetArchive(
  query: string,
  maxResults: number = 10
): Promise<SearchResult> {
  try {
    // 构建搜索参数
    // mediatype:texts 限制为书籍/文本
    // language:(chi OR chinese OR eng OR english) 支持中英文
    const searchQuery = `${query} AND mediatype:texts`;

    const params = new URLSearchParams({
      q: searchQuery,
      fl: [
        "identifier",
        "title",
        "creator",
        "description",
        "date",
        "year",
        "publisher",
        "language",
        "subject",
        "imagecount",
        "avg_rating",
        "num_reviews",
      ].join(","),
      rows: maxResults.toString(),
      page: "1",
      output: "json",
      sort: "downloads desc", // 按下载量排序
    });

    const response = await fetch(`${IA_API_BASE}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Internet Archive API error: ${response.status}`);
    }

    const data: IASearchResponse = await response.json();

    const books = data.response.docs.map(iaDocToBook);

    console.log(`[InternetArchive] Found ${books.length} books for "${query}"`);

    return {
      books,
      totalItems: data.response.numFound,
      query,
    };
  } catch (error) {
    console.error("[InternetArchive] Search error:", error);
    return {
      books: [],
      totalItems: 0,
      query,
    };
  }
}

/**
 * 检查书籍是否可以在线阅读
 * @param identifier Internet Archive 标识符
 */
export async function checkReadableOnline(identifier: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://archive.org/metadata/${identifier}/files`
    );
    if (!response.ok) return false;

    const data = await response.json();
    // 检查是否有可读取的格式
    const readableFormats = ["pdf", "epub", "djvu", "txt"];
    return data.result?.some((file: { format?: string }) =>
      readableFormats.some((fmt) =>
        file.format?.toLowerCase().includes(fmt)
      )
    );
  } catch {
    return false;
  }
}
