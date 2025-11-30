import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchGoogleBooks } from "@/lib/api/google-books";
import { searchOpenLibrary } from "@/lib/api/open-library";
import { searchInternetArchive } from "@/lib/api/internet-archive";
import { searchDoubanBooks, isChineseQuery, enrichBooksWithDouban } from "@/lib/api/douban";
import { Book } from "@/types/book";

/**
 * 检测是否为文学/小说类查询
 */
function isFictionQuery(query: string): boolean {
  const fictionKeywords = [
    "小说", "文学", "经典", "名著", "故事", "散文", "诗歌", "诗集",
    "科幻", "奇幻", "悬疑", "推理", "言情", "武侠", "历史小说",
    "fiction", "novel", "literature", "classic", "story", "poetry"
  ];
  const lowerQuery = query.toLowerCase();
  return fictionKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * 检测是否为理论/原理类查询
 * 如果用户明确想要理论类书籍，不应该添加"入门教程"
 */
function isTheoreticalQuery(query: string): boolean {
  const theoreticalKeywords = [
    "原理", "底层", "理论", "设计", "实现", "架构", "内幕", "源码",
    "深入理解", "深入", "内核", "核心", "本质", "机制",
    "principles", "internals", "design", "implementation", "architecture",
    "in-depth", "core", "mechanism", "kernel"
  ];
  const lowerQuery = query.toLowerCase();
  return theoreticalKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * 优化搜索查询
 * 根据查询类型智能添加关键词
 */
function optimizeSearchQuery(query: string): string {
  let optimized = query;

  // 保护复合词不被拆分
  const protectedTerms = [
    "机器学习", "深度学习", "强化学习", "自然语言处理", "计算机视觉",
    "操作系统", "数据结构", "计算机网络", "编译原理", "数据库原理",
    "深入理解", "设计模式"
  ];
  const placeholders: Record<string, string> = {};
  protectedTerms.forEach((term, i) => {
    if (optimized.includes(term)) {
      placeholders[`__TERM${i}__`] = term;
      optimized = optimized.replace(term, `__TERM${i}__`);
    }
  });

  // 移除无关的描述性词汇（但保留有意义的修饰词）
  const removeWords = ["全栈开发者", "开发者", "程序员", "工程师", "我想", "了解", "编程背景"];
  for (const word of removeWords) {
    optimized = optimized.replace(new RegExp(word, "g"), "");
  }

  // 恢复保护的复合词
  Object.entries(placeholders).forEach(([placeholder, term]) => {
    optimized = optimized.replace(placeholder, term);
  });

  // 检测是否为中文查询
  const isChinese = /[\u4e00-\u9fff]/.test(optimized);

  // 检测查询类型
  const isFiction = isFictionQuery(optimized);
  const isTheoretical = isTheoreticalQuery(optimized);

  if (isChinese) {
    if (isFiction) {
      // 文学类：保持查询纯净，不添加额外关键词
      // 不做任何修改
    } else if (isTheoretical) {
      // 理论类：不添加"入门教程"，保持原样或可以添加"经典"
      // 如果已有理论相关词，保持原样
      console.log("[Tool] Detected theoretical query, skipping tutorial keywords");
    } else {
      // 实战/教程类：添加教程关键词
      const hasEducationalKeyword = /教程|入门|实战|指南|基础|学习/.test(optimized);
      if (!hasEducationalKeyword) {
        optimized = optimized.trim() + " 入门教程";
      }
    }
  }

  return optimized.trim().replace(/\s+/g, " ");
}

/**
 * 知名热门技术书籍列表
 * 这些书籍应该优先推荐
 */
const FAMOUS_TECH_BOOKS: Record<string, { title: string; authors: string[]; bonus: number }[]> = {
  ai: [
    { title: "Deep Learning", authors: ["Ian Goodfellow", "Yoshua Bengio"], bonus: 100 },
    { title: "深度学习", authors: ["花书", "Ian Goodfellow"], bonus: 100 },
    { title: "Hands-On Machine Learning", authors: ["Aurélien Géron"], bonus: 90 },
    { title: "机器学习实战", authors: ["Peter Harrington"], bonus: 85 },
    { title: "Pattern Recognition", authors: ["Christopher Bishop"], bonus: 85 },
    { title: "统计学习方法", authors: ["李航"], bonus: 90 },
    { title: "机器学习", authors: ["周志华", "西瓜书"], bonus: 95 },
    { title: "Python Machine Learning", authors: ["Sebastian Raschka"], bonus: 80 },
    { title: "Artificial Intelligence: A Modern Approach", authors: ["Stuart Russell", "Peter Norvig"], bonus: 95 },
    { title: "人工智能：一种现代方法", authors: ["Stuart Russell"], bonus: 95 },
    { title: "Neural Networks and Deep Learning", authors: ["Michael Nielsen"], bonus: 80 },
    { title: "动手学深度学习", authors: ["李沐", "Aston Zhang"], bonus: 90 },
    { title: "Dive into Deep Learning", authors: ["Aston Zhang"], bonus: 90 },
    { title: "百面机器学习", authors: ["葫芦娃"], bonus: 80 },
    { title: "Machine Learning Yearning", authors: ["Andrew Ng", "吴恩达"], bonus: 85 },
  ],
  python: [
    { title: "Python编程：从入门到实践", authors: ["Eric Matthes"], bonus: 90 },
    { title: "Python Crash Course", authors: ["Eric Matthes"], bonus: 90 },
    { title: "流畅的Python", authors: ["Luciano Ramalho"], bonus: 95 },
    { title: "Fluent Python", authors: ["Luciano Ramalho"], bonus: 95 },
    { title: "Python Cookbook", authors: ["David Beazley"], bonus: 85 },
    { title: "Effective Python", authors: ["Brett Slatkin"], bonus: 85 },
    { title: "Learning Python", authors: ["Mark Lutz"], bonus: 80 },
  ],
  javascript: [
    { title: "JavaScript高级程序设计", authors: ["Nicholas Zakas", "红宝书"], bonus: 95 },
    { title: "Professional JavaScript", authors: ["Nicholas Zakas"], bonus: 95 },
    { title: "JavaScript权威指南", authors: ["David Flanagan", "犀牛书"], bonus: 90 },
    { title: "JavaScript: The Good Parts", authors: ["Douglas Crockford"], bonus: 85 },
    { title: "你不知道的JavaScript", authors: ["Kyle Simpson"], bonus: 90 },
    { title: "You Don't Know JS", authors: ["Kyle Simpson"], bonus: 90 },
    { title: "Eloquent JavaScript", authors: ["Marijn Haverbeke"], bonus: 85 },
  ],
  algorithm: [
    { title: "算法导论", authors: ["Thomas Cormen", "CLRS"], bonus: 100 },
    { title: "Introduction to Algorithms", authors: ["Thomas Cormen"], bonus: 100 },
    { title: "算法", authors: ["Robert Sedgewick"], bonus: 90 },
    { title: "Algorithms", authors: ["Robert Sedgewick"], bonus: 90 },
    { title: "编程珠玑", authors: ["Jon Bentley"], bonus: 85 },
    { title: "Programming Pearls", authors: ["Jon Bentley"], bonus: 85 },
    { title: "剑指Offer", authors: ["何海涛"], bonus: 80 },
    { title: "LeetCode", authors: [], bonus: 75 },
  ],
  system: [
    { title: "深入理解计算机系统", authors: ["Randal Bryant", "CSAPP"], bonus: 100 },
    { title: "Computer Systems: A Programmer's Perspective", authors: ["Randal Bryant"], bonus: 100 },
    { title: "操作系统导论", authors: ["Remzi Arpaci"], bonus: 90 },
    { title: "Operating Systems: Three Easy Pieces", authors: ["Remzi Arpaci"], bonus: 90 },
    { title: "现代操作系统", authors: ["Andrew Tanenbaum"], bonus: 90 },
    { title: "计算机网络", authors: ["谢希仁", "James Kurose"], bonus: 85 },
    { title: "TCP/IP详解", authors: ["W. Richard Stevens"], bonus: 90 },
  ],
};

/**
 * 检查书籍是否是知名热门书籍
 */
function getFamousBookBonus(book: Book, query: string): number {
  const title = (book.title || "").toLowerCase();
  const authors = (book.authors || []).join(" ").toLowerCase();
  const queryLower = query.toLowerCase();
  
  // 确定查询类型
  let categories: string[] = [];
  if (queryLower.includes("ai") || queryLower.includes("人工智能") || 
      queryLower.includes("机器学习") || queryLower.includes("深度学习") ||
      queryLower.includes("machine learning") || queryLower.includes("deep learning")) {
    categories.push("ai");
  }
  if (queryLower.includes("python")) {
    categories.push("python");
  }
  if (queryLower.includes("javascript") || queryLower.includes("js") || queryLower.includes("前端")) {
    categories.push("javascript");
  }
  if (queryLower.includes("算法") || queryLower.includes("algorithm") || queryLower.includes("数据结构")) {
    categories.push("algorithm");
  }
  if (queryLower.includes("系统") || queryLower.includes("操作系统") || queryLower.includes("网络") ||
      queryLower.includes("system") || queryLower.includes("operating")) {
    categories.push("system");
  }
  
  // 检查所有相关类别
  for (const category of categories) {
    const famousBooks = FAMOUS_TECH_BOOKS[category] || [];
    for (const famous of famousBooks) {
      const famousTitle = famous.title.toLowerCase();
      const famousAuthors = famous.authors.map(a => a.toLowerCase());
      
      // 标题匹配
      if (title.includes(famousTitle) || famousTitle.includes(title)) {
        return famous.bonus;
      }
      
      // 作者匹配（且标题相关）
      for (const famousAuthor of famousAuthors) {
        if (famousAuthor && authors.includes(famousAuthor)) {
          // 确认标题也有相关性
          const titleWords = famousTitle.split(/\s+/);
          for (const word of titleWords) {
            if (word.length > 3 && title.includes(word)) {
              return famous.bonus;
            }
          }
        }
      }
    }
  }
  
  return 0;
}

/**
 * 计算书籍与查询的相关性分数
 */
function calculateRelevanceScore(book: Book, query: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const title = (book.title || "").toLowerCase();
  const description = (book.description || "").toLowerCase();
  const categories = (book.categories || []).join(" ").toLowerCase();

  let score = 0;

  // 检测查询类型
  const isTheoretical = isTheoreticalQuery(query);
  const isFiction = isFictionQuery(query);

  // 首先检查是否是知名热门书籍（非小说类）
  if (!isFiction) {
    const famousBonus = getFamousBookBonus(book, query);
    if (famousBonus > 0) {
      score += famousBonus;
      console.log(`[Score] Famous book bonus for "${book.title}": +${famousBonus}`);
    }
  }

  // 核心主题关键词（必须匹配）
  const coreTopics = [
    "机器学习", "深度学习", "人工智能", "python", "javascript", "数据分析", "web开发",
    "操作系统", "数据结构", "算法", "计算机网络", "编译", "数据库", "react", "vue",
    "java", "c++", "go", "rust", "typescript", "ai", "ml", "machine learning", "deep learning"
  ];
  const queryCoreTopics = queryTerms.filter(t => coreTopics.some(c => c.includes(t) || t.includes(c)));

  // 如果查询包含核心主题，但书名不包含，大幅减分
  for (const topic of queryCoreTopics) {
    if (title.includes(topic)) {
      score += 20; // 标题匹配核心主题，高分
    } else if (description.includes(topic)) {
      score += 5; // 描述匹配，中等分数
    } else {
      score -= 15; // 核心主题不匹配，减分
    }
  }

  // 标题匹配其他查询词
  for (const term of queryTerms) {
    if (!coreTopics.some(c => c.includes(term))) {
      if (title.includes(term)) score += 5;
      if (description.includes(term)) score += 2;
      if (categories.includes(term)) score += 3;
    }
  }

  // 根据查询类型调整评分
  if (isTheoretical) {
    // 理论类查询：给理论类书籍加分
    const theoreticalTerms = [
      "原理", "设计", "实现", "架构", "内幕", "源码", "深入理解", "深入",
      "内核", "核心", "本质", "机制", "底层", "理论",
      "principles", "internals", "design", "implementation", "architecture",
      "in-depth", "core", "mechanism", "kernel", "theory"
    ];
    for (const term of theoreticalTerms) {
      if (title.includes(term)) score += 15;
      if (description.includes(term)) score += 5;
    }
    // 对于理论类查询，"入门教程"类书籍减分
    const tutorialTerms = ["入门", "教程", "从零开始", "tutorial", "beginner", "for dummies"];
    for (const term of tutorialTerms) {
      if (title.includes(term)) score -= 5;
    }
  } else if (!isFiction) {
    // 实战/教程类查询：给教程类书籍加分
    const educationalTerms = ["入门", "教程", "实战", "指南", "学习", "基础", "从入门到", "tutorial", "introduction", "guide", "learning"];
    for (const term of educationalTerms) {
      if (title.includes(term)) score += 8;
      if (description.includes(term)) score += 2;
    }
  }

  // 有完整信息的书籍加分
  if (book.authors && book.authors.length > 0 && book.authors[0] !== "Unknown Author") score += 3;
  if (book.publishedDate) score += 2;
  if (book.thumbnail) score += 2;
  if (book.description && book.description.length > 50) score += 2;
  
  // 豆瓣来源的书籍加分（通常评分更可靠）
  if (book.source === "douban") {
    score += 15;
  }

  // 不相关书籍减分
  const irrelevantTerms = ["营销", "商业", "管理", "领导", "oracle", "城区", "龙华", "marketing", "business", "misc", "杂志", "周刊"];
  for (const term of irrelevantTerms) {
    if (title.includes(term)) score -= 30;
  }
  
  // 低质量书籍减分
  const lowQualityIndicators = ["fake", "misc", "collection", "合集", "大全", "速成"];
  for (const term of lowQualityIndicators) {
    if (title.includes(term)) score -= 20;
  }

  // 小说类查询的特殊处理
  if (isFiction) {
    // 重置分数，对小说类使用完全不同的评分逻辑
    score = 0;
    
    // 1. 首先检查是否是明显的非小说类书籍（直接排除）
    const definitelyNotFiction = [
      "教程", "入门", "指南", "手册", "开发", "编程", "教学", "应用", "技术",
      "周刊", "杂志", "期刊", "报", "年鉴", "词典", "字典", "教材", "论文",
      "internet", "电脑", "计算机", "软件", "网络", "系统", "数据", "算法",
      "tutorial", "guide", "manual", "programming", "development", "computer",
      "机器人学", "人工智能导论", "城市规划", "都市計劃", "city planning",
      "科学文化", "科學文化", "research", "study", "analysis",
      "translation", "翻译", "翻譯", "linguistics", "语言学", "創作與研究", "解構"
    ];
    for (const term of definitelyNotFiction) {
      if (title.toLowerCase().includes(term.toLowerCase())) {
        return -100; // 直接返回最低分，确保被过滤
      }
    }
    
    // 2. 检查是否是"解读"、"分析"、"世界观"类书籍（减分但不完全排除）
    const analysisBookTerms = [
      "世界观", "解读", "解析", "分析", "研究", "评论", "导读", "赏析",
      "organization", "character", "analysis", "companion", "guide to"
    ];
    let isAnalysisBook = false;
    for (const term of analysisBookTerms) {
      if (title.toLowerCase().includes(term.toLowerCase())) {
        isAnalysisBook = true;
        score -= 80; // 解读类书籍大幅减分
        break;
      }
    }
    
    // 3. 标题必须包含小说相关词才能得高分
    const fictionTitleIndicators = [
      "小说", "小說", "novel", "fiction",
      "科幻", "奇幻", "悬疑", "推理", "言情", "武侠", "玄幻", "穿越",
      "fantasy", "mystery", "romance", "thriller"
    ];
    
    let hasFictionInTitle = false;
    for (const term of fictionTitleIndicators) {
      if (title.toLowerCase().includes(term.toLowerCase())) {
        hasFictionInTitle = true;
        score += 50;
        break;
      }
    }
    
    // 4. 分类中包含小说相关词
    const fictionCategoryIndicators = [
      "fiction", "novel", "science fiction", "fantasy", "mystery",
      "小说", "科幻", "文学"
    ];
    let hasFictionInCategory = false;
    for (const term of fictionCategoryIndicators) {
      if (categories.toLowerCase().includes(term.toLowerCase())) {
        hasFictionInCategory = true;
        score += 30;
        break;
      }
    }
    
    // 5. 检查查询中的具体类型是否匹配
    const queryFictionType = query.includes("科幻") ? "科幻" :
                             query.includes("奇幻") || query.includes("玄幻") ? "奇幻" :
                             query.includes("悬疑") || query.includes("推理") ? "推理" :
                             query.includes("武侠") ? "武侠" :
                             query.includes("言情") ? "言情" : null;
    
    if (queryFictionType === "科幻") {
      // 科幻类特殊匹配
      const sciFiTitleTerms = ["科幻", "science fiction", "sci-fi", "银河", "基地", "火星", "太空", "星际"];
      for (const term of sciFiTitleTerms) {
        if (title.toLowerCase().includes(term.toLowerCase())) {
          score += 40;
          hasFictionInTitle = true;
        }
      }
      // 分类匹配
      if (categories.toLowerCase().includes("science fiction")) {
        score += 30;
        hasFictionInCategory = true;
      }
    }
    
    // 6. 知名科幻作者加分（非常重要）- 但解读类书籍除外
    const knownSciFiAuthors = [
      "刘慈欣", "阿西莫夫", "asimov", "艾萨克·阿西莫夫", "isaac asimov",
      "克拉克", "arthur clarke", "海因莱因", "heinlein",
      "威尔斯", "h.g. wells", "王晋康", "何夕", "韩松"
    ];
    for (const author of knownSciFiAuthors) {
      if (book.authors.some(a => a.toLowerCase().includes(author.toLowerCase()))) {
        if (!isAnalysisBook) {
          score += 80; // 知名作者的原著加更多分
        }
        hasFictionInTitle = true;
      }
    }
    
    // 7. 知名作品名加分 - 但要区分原著和解读
    const knownSciFiWorks = [
      { name: "三体", bonus: 100 },
      { name: "基地", bonus: 80 },
      { name: "foundation", bonus: 80 },
      { name: "银河帝国", bonus: 80 },
      { name: "2001", bonus: 60 },
      { name: "火星", bonus: 40 },
      { name: "黑暗森林", bonus: 80 },
      { name: "死神永生", bonus: 80 }
    ];
    for (const work of knownSciFiWorks) {
      if (title.toLowerCase().includes(work.name.toLowerCase())) {
        // 如果是原著（标题就是作品名或很短），加更多分
        const isOriginalWork = title.length < work.name.length + 10 || 
                               title.startsWith(work.name) ||
                               title.includes("全集") ||
                               title.includes("七部曲") ||
                               title.includes("三部曲");
        if (isOriginalWork && !isAnalysisBook) {
          score += work.bonus;
        } else {
          score += Math.floor(work.bonus * 0.3); // 解读类只加30%
        }
        hasFictionInTitle = true;
      }
    }
    
    // 8. 如果标题和分类都不包含小说相关词，大幅减分
    if (!hasFictionInTitle && !hasFictionInCategory) {
      const strongFictionDescTerms = ["故事讲述", "主人公", "小说", "科幻"];
      let hasStrongFictionDesc = false;
      for (const term of strongFictionDescTerms) {
        if (description.includes(term)) {
          hasStrongFictionDesc = true;
          score += 10;
          break;
        }
      }
      
      if (!hasStrongFictionDesc) {
        return -50;
      }
    }
    
    // 9. 有完整信息的书籍小幅加分
    if (book.authors && book.authors.length > 0 && book.authors[0] !== "Unknown Author") score += 5;
    if (book.thumbnail) score += 3;
    
    // 10. 豆瓣来源的书籍额外加分（通常质量更高）
    if (book.source === "douban") {
      score += 20;
    }
    
    return score;
  }

  return score;
}

/**
 * 为 Google Books 构建多个搜索查询
 * 返回多个查询变体以获取更多相关结果
 * 对于中文查询，优先使用中文关键词
 */
function buildGoogleBooksQueries(query: string, isChinese: boolean): string[] {
  const isFiction = isFictionQuery(query);
  const queries: string[] = [];
  
  // 提取核心关键词
  const words = query.split(/\s+/).filter(w => w.length >= 2);
  const modifiers = ["热门", "推荐", "经典", "最新", "畅销"];
  const coreWords = words.filter(w => !modifiers.includes(w));
  
  // 如果有具体书名，优先搜索
  const bookNameMatch = query.match(/《([^》]+)》/);
  if (bookNameMatch) {
    queries.push(bookNameMatch[1]);
  }
  
  // 对于小说类查询
  if (isFiction) {
    if (isChinese) {
      // 中文查询：优先使用中文关键词搜索具体作品
      if (query.includes("科幻")) {
        // 知名科幻作品和作者
        queries.push("三体 刘慈欣");
        queries.push("银河帝国 阿西莫夫");
        queries.push("科幻小说");
        queries.push("中国科幻");
        queries.push("基地 阿西莫夫");
      } else if (query.includes("奇幻") || query.includes("玄幻")) {
        queries.push("奇幻小说");
        queries.push("玄幻小说");
        queries.push("魔戒");
      } else if (query.includes("悬疑") || query.includes("推理")) {
        queries.push("东野圭吾");
        queries.push("推理小说");
        queries.push("悬疑小说");
        queries.push("阿加莎");
      } else if (query.includes("言情") || query.includes("爱情")) {
        queries.push("言情小说");
        queries.push("爱情小说");
      } else if (query.includes("武侠")) {
        queries.push("金庸");
        queries.push("武侠小说");
        queries.push("古龙");
      } else {
        queries.push("中文小说");
        queries.push("华语小说");
      }
    } else {
      // 英文查询
      if (query.includes("sci-fi") || query.includes("science fiction")) {
        queries.push("science fiction");
        queries.push("sci-fi novel");
      } else if (query.includes("fantasy")) {
        queries.push("fantasy novel");
      } else {
        queries.push("fiction novel");
      }
    }
    
    // 原始核心词也加入
    if (coreWords.length > 0) {
      queries.push(coreWords.join(""));
    }
  } else {
    // 非小说类（技术书籍）
    const queryLower = query.toLowerCase();
    
    // AI/机器学习相关
    if (queryLower.includes("ai") || queryLower.includes("人工智能") || 
        queryLower.includes("机器学习") || queryLower.includes("深度学习") ||
        queryLower.includes("machine learning") || queryLower.includes("deep learning")) {
      if (isChinese) {
        queries.push("机器学习 周志华");
        queries.push("深度学习 花书");
        queries.push("统计学习方法 李航");
        queries.push("动手学深度学习");
        queries.push("机器学习实战");
      } else {
        queries.push("Deep Learning Goodfellow");
        queries.push("Hands-On Machine Learning Géron");
        queries.push("Machine Learning Mitchell");
        queries.push("Artificial Intelligence Modern Approach");
        queries.push("Pattern Recognition Bishop");
      }
    }
    
    // Python 相关
    else if (queryLower.includes("python")) {
      if (isChinese) {
        queries.push("Python编程从入门到实践");
        queries.push("流畅的Python");
        queries.push("Python Cookbook");
      } else {
        queries.push("Python Crash Course Matthes");
        queries.push("Fluent Python Ramalho");
        queries.push("Effective Python Slatkin");
        queries.push("Learning Python Lutz");
      }
    }
    
    // JavaScript 相关
    else if (queryLower.includes("javascript") || queryLower.includes("js") || queryLower.includes("前端")) {
      if (isChinese) {
        queries.push("JavaScript高级程序设计");
        queries.push("你不知道的JavaScript");
        queries.push("JavaScript权威指南");
      } else {
        queries.push("JavaScript The Good Parts");
        queries.push("You Don't Know JS");
        queries.push("Eloquent JavaScript");
        queries.push("Professional JavaScript");
      }
    }
    
    // 算法相关
    else if (queryLower.includes("算法") || queryLower.includes("algorithm") || queryLower.includes("数据结构")) {
      if (isChinese) {
        queries.push("算法导论");
        queries.push("剑指Offer");
        queries.push("编程珠玑");
        queries.push("算法 第4版");
      } else {
        queries.push("Introduction to Algorithms CLRS");
        queries.push("Algorithms Sedgewick");
        queries.push("Programming Pearls");
        queries.push("Cracking the Coding Interview");
      }
    }
    
    // 默认：使用原始查询
    else {
      queries.push(query);
      if (coreWords.length > 0 && coreWords.join("") !== query) {
        queries.push(coreWords.join(" "));
      }
    }
    
    // 也添加原始查询作为备选
    if (!queries.includes(query)) {
      queries.push(query);
    }
  }
  
  // 去重并限制数量
  return [...new Set(queries)].filter(q => q.length >= 2).slice(0, 5);
}

/**
 * 搜索书籍工具
 * 使用 Function Calling 方式定义
 * 集成多个数据源，根据语言偏好动态调整配比：
 * - 中文优先：豆瓣 50% + Google Books 50%
 * - 英文优先：Google Books 70% + Open Library 30%
 * - 不限语言：Google Books 50% + 豆瓣 30% + Open Library 20%
 * 目标返回 20 条高质量结果
 */
export const searchBooksTool = tool(
  async ({ query, maxResults = 20, language }): Promise<Book[]> => {
    // 优化搜索词
    const optimizedQuery = optimizeSearchQuery(query);
    const queryHasChinese = isChineseQuery(query);
    const isFiction = isFictionQuery(query);
    
    // 根据用户选择的语言偏好和查询语言综合判断
    // language: "zh" = 中文, "en" = 英文, "any" = 不限
    const preferChinese = language === "zh" || (language === "any" && queryHasChinese);
    const preferEnglish = language === "en";
    const noPreference = language === "any";

    console.log(`[Tool] Original query: "${query}"`);
    console.log(`[Tool] Optimized query: "${optimizedQuery}"`);
    console.log(`[Tool] Query has Chinese: ${queryHasChinese}, Language preference: ${language}`);
    console.log(`[Tool] Is Fiction: ${isFiction}`);
    console.log(`[Tool] Target results: ${maxResults}`);

    try {
      // 根据语言偏好动态调整数据源配比
      let googleRatio: number;
      let doubanRatio: number;
      let openLibraryRatio: number;
      
      if (preferEnglish) {
        // 英文优先：主要用 Google Books 和 Open Library
        googleRatio = 0.7;
        doubanRatio = 0;
        openLibraryRatio = 0.3;
      } else if (noPreference && !queryHasChinese) {
        // 不限语言 + 英文查询：混合搜索
        googleRatio = 0.6;
        doubanRatio = 0.2;
        openLibraryRatio = 0.2;
      } else if (noPreference) {
        // 不限语言 + 中文查询：中英混合
        googleRatio = 0.5;
        doubanRatio = 0.3;
        openLibraryRatio = 0.2;
      } else {
        // 中文优先
        googleRatio = 0.5;
        doubanRatio = 0.5;
        openLibraryRatio = 0;
      }
      
      const googleTargetCount = Math.ceil(maxResults * googleRatio);
      const doubanTargetCount = Math.ceil(maxResults * doubanRatio);
      const openLibraryTargetCount = Math.ceil(maxResults * openLibraryRatio);
      
      // 搜索时获取更多结果以便筛选
      const googleSearchMax = googleTargetCount * 4;
      const doubanSearchMax = doubanTargetCount * 5;
      const openLibrarySearchMax = openLibraryTargetCount * 3;
      
      console.log(`[Tool] Source ratio - Google: ${googleRatio * 100}%, Douban: ${doubanRatio * 100}%, OpenLibrary: ${openLibraryRatio * 100}%`);

      // 为 Google Books 构建多个搜索查询
      // 如果不限语言，同时搜索中英文
      const googleQueries = noPreference 
        ? [...buildGoogleBooksQueries(optimizedQuery, true), ...buildGoogleBooksQueries(optimizedQuery, false)].slice(0, 6)
        : buildGoogleBooksQueries(optimizedQuery, preferChinese);
      console.log(`[Tool] Google Books queries:`, googleQueries);

      // 设置语言过滤器
      // 如果是"不限"，不设置语言过滤，让 Google 返回混合结果
      const googleFilters = preferChinese && !noPreference ? { language: "zh" } : 
                           preferEnglish ? { language: "en" } : undefined;

      // Google Books 多查询并行搜索
      const googlePromises = googleQueries.map(q => 
        searchGoogleBooks(q, googleFilters, Math.ceil(googleSearchMax / googleQueries.length)).catch((e) => {
          console.error(`[Tool] Google Books error for "${q}":`, e);
          return { books: [], total: 0 };
        })
      );

      // 其他数据源
      const otherPromises: Promise<{ books: Book[]; total?: number; source?: string }>[] = [];

      // 豆瓣（中文书籍）- 根据语言偏好决定是否搜索
      if (doubanRatio > 0) {
        // 构建多个豆瓣搜索查询 - 增加更多知名作品/作者
        const doubanQueries: string[] = [];
        
        // 如果有具体书名，优先搜索
        const bookNameMatch = query.match(/《([^》]+)》/);
        if (bookNameMatch) {
          doubanQueries.push(bookNameMatch[1]);
        }
        
        // 对于小说，添加知名作品和作者搜索
        if (isFiction) {
          if (query.includes("科幻")) {
            doubanQueries.push("三体");
            doubanQueries.push("刘慈欣");
            doubanQueries.push("银河帝国");
            doubanQueries.push("阿西莫夫");
            doubanQueries.push("基地");
            doubanQueries.push("王晋康");
            doubanQueries.push("何夕");
          } else if (query.includes("悬疑") || query.includes("推理")) {
            doubanQueries.push("东野圭吾");
            doubanQueries.push("白夜行");
            doubanQueries.push("嫌疑人");
            doubanQueries.push("阿加莎");
          } else if (query.includes("武侠")) {
            doubanQueries.push("金庸");
            doubanQueries.push("射雕");
            doubanQueries.push("天龙八部");
            doubanQueries.push("古龙");
          } else if (query.includes("奇幻") || query.includes("玄幻")) {
            doubanQueries.push("魔戒");
            doubanQueries.push("冰与火");
          }
        }
        
        // 对于技术类书籍，添加常见搜索词
        if (!isFiction) {
          // 提取查询中的关键技术词
          const techKeywords = ["AI", "机器学习", "深度学习", "Python", "Java", "前端", "后端", "算法", "数据"];
          for (const keyword of techKeywords) {
            if (query.includes(keyword) || optimizedQuery.includes(keyword)) {
              doubanQueries.push(keyword);
            }
          }
        }
        
        // 原始查询也加入
        doubanQueries.push(optimizedQuery);
        
        // 去重并限制数量
        const uniqueDoubanQueries = [...new Set(doubanQueries)].filter(q => q.length >= 2).slice(0, 8);
        console.log(`[Tool] Douban queries:`, uniqueDoubanQueries);
        
        for (const dq of uniqueDoubanQueries) {
          otherPromises.push(
            searchDoubanBooks(dq, Math.ceil(doubanSearchMax / Math.max(uniqueDoubanQueries.length, 1))).then(r => ({ ...r, source: 'douban' })).catch((e) => {
              console.error(`[Tool] Douban error for "${dq}":`, e);
              return { books: [], totalItems: 0, query: dq, source: 'douban' };
            })
          );
        }
      }

      // Open Library - 根据语言偏好决定是否搜索
      if (openLibraryRatio > 0) {
        // 构建英文搜索查询
        const openLibraryQuery = queryHasChinese 
          ? optimizedQuery.replace(/[\u4e00-\u9fff]+/g, '').trim() || query  // 移除中文字符
          : optimizedQuery;
        
        console.log(`[Tool] Open Library query:`, openLibraryQuery);
        
        otherPromises.push(
          searchOpenLibrary(openLibraryQuery, openLibrarySearchMax).then(r => ({ ...r, source: 'openlibrary' })).catch((e) => {
            console.error("[Tool] Open Library error:", e);
            return { books: [], total: 0, source: 'openlibrary' };
          })
        );
        
        // 如果是技术类查询，添加英文关键词搜索
        if (!isFiction) {
          const englishTechQueries = [];
          if (query.toLowerCase().includes("ai") || query.includes("人工智能")) {
            englishTechQueries.push("artificial intelligence");
            englishTechQueries.push("machine learning");
          }
          if (query.includes("机器学习")) {
            englishTechQueries.push("machine learning");
          }
          if (query.includes("深度学习")) {
            englishTechQueries.push("deep learning");
          }
          
          for (const eq of englishTechQueries.slice(0, 2)) {
            otherPromises.push(
              searchOpenLibrary(eq, Math.ceil(openLibrarySearchMax / 2)).then(r => ({ ...r, source: 'openlibrary' })).catch((e) => {
                console.error(`[Tool] Open Library error for "${eq}":`, e);
                return { books: [], total: 0, source: 'openlibrary' };
              })
            );
          }
        }
      }

      // Internet Archive - 对于非小说类（但网络不稳定，设置超时）
      if (!isFiction && openLibraryRatio > 0) {
        const iaPromise = Promise.race([
          searchInternetArchive(optimizedQuery, openLibrarySearchMax).then(r => ({ ...r, source: 'internetarchive' })),
          new Promise<{ books: Book[]; totalItems: number; query: string; source: string }>((_, reject) => 
            setTimeout(() => reject(new Error('Internet Archive timeout')), 5000)
          )
        ]).catch((e) => {
          console.error("[Tool] Internet Archive error:", e.message || e);
          return { books: [], totalItems: 0, query: optimizedQuery, source: 'internetarchive' };
        });
        
        otherPromises.push(iaPromise
        );
      }

      // 并行执行所有搜索
      const [googleResults, otherResults] = await Promise.all([
        Promise.all(googlePromises),
        Promise.all(otherPromises)
      ]);

      // 合并 Google Books 结果
      let googleBooks: Book[] = [];
      for (const result of googleResults) {
        if (result && result.books) {
          googleBooks = [...googleBooks, ...result.books];
        }
      }
      console.log(`[Tool] Google Books total found: ${googleBooks.length} books`);

      // 合并其他数据源结果
      let otherBooks: Book[] = [];
      for (const result of otherResults) {
        if (result && result.books) {
          console.log(`[Tool] ${result.source || 'other'} found: ${result.books.length} books`);
          otherBooks = [...otherBooks, ...result.books];
        }
      }
      console.log(`[Tool] Other sources total found: ${otherBooks.length} books`);

      // 合并所有结果
      let allBooks: Book[] = [...googleBooks, ...otherBooks];
      console.log(`[Tool] Total books from all sources: ${allBooks.length}`);

      // 去重（基于标题相似度）
      const seen = new Set<string>();
      const uniqueBooks = allBooks.filter((book) => {
        // 标准化标题用于去重
        const normalizedTitle = book.title.toLowerCase()
          .replace(/[《》「」『』【】\[\]()（）]/g, '')
          .replace(/\s+/g, '');
        const key = `${normalizedTitle}-${book.authors.join(",").toLowerCase()}`;
        if (seen.has(key)) return false;
        
        // 也检查标题是否太相似
        for (const existingKey of seen) {
          const existingTitle = existingKey.split('-')[0];
          if (existingTitle.includes(normalizedTitle) || normalizedTitle.includes(existingTitle)) {
            if (normalizedTitle.length > 3 && existingTitle.length > 3) {
              return false; // 跳过相似标题
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
        score: calculateRelevanceScore(book, optimizedQuery),
      }));

      // 排序
      scoredBooks.sort((a, b) => b.score - a.score);

      // 打印前 10 个书籍的分数用于调试
      console.log(`[Tool] Top 10 scored books:`);
      scoredBooks.slice(0, 10).forEach((item, i) => {
        console.log(`  ${i + 1}. "${item.book.title}" (${item.book.source}) - score: ${item.score}`);
      });

      // 根据查询类型设置最低分数阈值
      // 小说类要求更严格的相关性
      const minScore = isFiction ? 10 : 0;
      
      // 过滤出高质量结果
      let highQualityBooks = scoredBooks
        .filter((item) => item.score >= minScore)
        .map((item) => item.book);

      console.log(`[Tool] High quality books (score >= ${minScore}): ${highQualityBooks.length}`);

      // 如果高质量结果不够，降低阈值但不接受负分
      if (highQualityBooks.length < maxResults) {
        const additionalBooks = scoredBooks
          .filter((item) => item.score >= 0 && item.score < minScore)
          .map((item) => item.book);
        highQualityBooks = [...highQualityBooks, ...additionalBooks];
        console.log(`[Tool] After adding score >= 0: ${highQualityBooks.length}`);
      }

      // 截取目标数量
      let filteredBooks = highQualityBooks.slice(0, maxResults);
      
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
      maxResults: z.number().optional().default(10).describe("返回的最大结果数"),
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
