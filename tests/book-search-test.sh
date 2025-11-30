#!/bin/bash

# 书籍搜索测试脚本
# 测试各种书籍类型的搜索功能
# 
# 使用方法:
#   chmod +x tests/book-search-test.sh
#   ./tests/book-search-test.sh [category]
#
# 可选参数:
#   all       - 测试所有类别（默认）
#   fiction   - 只测试小说类
#   tech      - 只测试技术类
#   zh        - 只测试中文类
#   en        - 只测试英文类
#   quick     - 快速测试（每类只测1个）

API_URL="http://localhost:3000/api/confirm-search"
RESULTS_DIR="tests/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 创建结果目录
mkdir -p "$RESULTS_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试函数
test_search() {
  local category="$1"
  local topic="$2"
  local lang="$3"
  local level="$4"
  local is_fiction="$5"
  local keywords="$6"
  
  echo ""
  echo -e "${BLUE}==========================================${NC}"
  echo -e "${YELLOW}测试: $category ($lang)${NC}"
  echo -e "${BLUE}==========================================${NC}"
  echo "主题: $topic"
  echo "关键词: $keywords"
  echo "语言: $lang"
  [ "$level" != "null" ] && echo "级别: $level"
  echo ""
  
  # 构建 JSON 请求
  if [ "$level" != "null" ]; then
    json_data=$(cat << EOJSON
{
  "message": "$topic",
  "preferences": {
    "topic": "$topic",
    "level": "$level",
    "language": "$lang",
    "confidence": 0.85,
    "isFiction": $is_fiction,
    "searchKeywords": $keywords
  }
}
EOJSON
)
  else
    json_data=$(cat << EOJSON
{
  "message": "$topic",
  "preferences": {
    "topic": "$topic",
    "language": "$lang",
    "confidence": 0.85,
    "isFiction": $is_fiction,
    "searchKeywords": $keywords
  }
}
EOJSON
)
  fi
  
  # 发送请求
  result=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$json_data" 2>/dev/null)
  
  # 解析结果
  book_count=$(echo "$result" | jq '.books | length' 2>/dev/null)
  
  if [ -z "$book_count" ] || [ "$book_count" = "null" ]; then
    book_count=0
  fi
  
  if [ "$book_count" -ge 15 ]; then
    echo -e "${GREEN}✓ 找到书籍数量: $book_count${NC}"
  elif [ "$book_count" -ge 10 ]; then
    echo -e "${YELLOW}△ 找到书籍数量: $book_count (偏少)${NC}"
  else
    echo -e "${RED}✗ 找到书籍数量: $book_count (不足)${NC}"
  fi
  
  echo ""
  echo "前8本书籍:"
  echo "$result" | jq -r '.books[:8][] | "  - \(.title) [\(.source)] 评分:\(.rating // "无")"' 2>/dev/null
  
  # 保存详细结果到文件
  echo "$result" | jq '.' > "$RESULTS_DIR/${category// /_}_${lang}_$TIMESTAMP.json" 2>/dev/null
  
  # 返回书籍数量用于统计
  LAST_COUNT=$book_count
}

# 主函数
main() {
  local filter="${1:-all}"
  
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     书籍搜索功能测试 - $(date '+%Y-%m-%d %H:%M')      ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
  echo ""
  echo "API 地址: $API_URL"
  echo "结果目录: $RESULTS_DIR"
  echo "测试范围: $filter"
  
  local total=0
  local passed=0
  
  # ============ 中文小说测试 ============
  if [ "$filter" = "all" ] || [ "$filter" = "fiction" ] || [ "$filter" = "zh" ]; then
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${YELLOW}开始测试: 中文小说${NC}"
    echo -e "${BLUE}============================================${NC}"
    
    test_search "小说-中文" "小说" "zh" "null" "true" '["小说", "经典小说"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    test_search "科幻小说-中文" "科幻小说" "zh" "null" "true" '["科幻", "科幻小说"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    if [ "$filter" != "quick" ]; then
      test_search "悬疑推理-中文" "悬疑推理小说" "zh" "null" "true" '["悬疑", "推理", "小说"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "武侠小说-中文" "武侠小说" "zh" "null" "true" '["武侠", "小说"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "文学-中文" "文学" "zh" "null" "true" '["文学", "经典文学"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    fi
  fi
  
  # ============ 英文小说测试 ============
  if [ "$filter" = "all" ] || [ "$filter" = "fiction" ] || [ "$filter" = "en" ]; then
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${YELLOW}开始测试: 英文小说${NC}"
    echo -e "${BLUE}============================================${NC}"
    
    test_search "Fiction-English" "fiction novel" "en" "null" "true" '["fiction", "novel"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    test_search "SciFi-English" "science fiction" "en" "null" "true" '["science fiction", "sci-fi"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    if [ "$filter" != "quick" ]; then
      test_search "Mystery-English" "mystery thriller" "en" "null" "true" '["mystery", "thriller"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "Literature-English" "literature classic" "en" "null" "true" '["literature", "classic"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "Fantasy-English" "fantasy novel" "en" "null" "true" '["fantasy", "novel"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    fi
  fi
  
  # ============ 中文非虚构测试 ============
  if [ "$filter" = "all" ] || [ "$filter" = "zh" ]; then
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${YELLOW}开始测试: 中文非虚构${NC}"
    echo -e "${BLUE}============================================${NC}"
    
    test_search "历史-中文" "历史" "zh" "null" "false" '["历史", "中国历史"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    test_search "艺术-中文" "艺术" "zh" "null" "false" '["艺术", "绘画"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    if [ "$filter" != "quick" ]; then
      test_search "人物传记-中文" "传记" "zh" "null" "false" '["传记", "人物"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "哲学-中文" "哲学" "zh" "null" "false" '["哲学", "思想"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "心理学-中文" "心理学" "zh" "null" "false" '["心理学", "心理"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "社会学-中文" "社会学" "zh" "null" "false" '["社会学", "社会"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "经济理财-中文" "投资理财" "zh" "null" "false" '["投资", "理财"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "个人成长-中文" "自我提升" "zh" "null" "false" '["自我提升", "成长"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "军事历史-中文" "军事历史" "zh" "null" "false" '["军事", "历史"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    fi
  fi
  
  # ============ 英文非虚构测试 ============
  if [ "$filter" = "all" ] || [ "$filter" = "en" ]; then
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${YELLOW}开始测试: 英文非虚构${NC}"
    echo -e "${BLUE}============================================${NC}"
    
    test_search "History-English" "history" "en" "null" "false" '["history", "world history"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    test_search "Art-English" "art" "en" "null" "false" '["art", "painting"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    if [ "$filter" != "quick" ]; then
      test_search "Biography-English" "biography" "en" "null" "false" '["biography", "memoir"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "Philosophy-English" "philosophy" "en" "null" "false" '["philosophy"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "Psychology-English" "psychology" "en" "null" "false" '["psychology"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "Sociology-English" "sociology" "en" "null" "false" '["sociology", "social"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "Finance-English" "investing finance" "en" "null" "false" '["investing", "finance"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "SelfHelp-English" "self improvement" "en" "null" "false" '["self improvement", "self help"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "Military-English" "military history" "en" "null" "false" '["military", "history"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    fi
  fi
  
  # ============ 中文技术书测试 ============
  if [ "$filter" = "all" ] || [ "$filter" = "tech" ] || [ "$filter" = "zh" ]; then
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${YELLOW}开始测试: 中文技术书${NC}"
    echo -e "${BLUE}============================================${NC}"
    
    test_search "编程入门-中文" "编程入门" "zh" "beginner" "false" '["编程入门", "Python入门"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    test_search "机器学习-中文" "机器学习" "zh" "intermediate" "false" '["机器学习", "AI"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    if [ "$filter" != "quick" ]; then
      test_search "编程进阶-中文" "编程" "zh" "intermediate" "false" '["编程", "软件开发"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "深度学习-中文" "深度学习" "zh" "advanced" "false" '["深度学习", "神经网络"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "数据库-中文" "数据库" "zh" "intermediate" "false" '["数据库", "MySQL"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "前端开发-中文" "前端开发" "zh" "intermediate" "false" '["前端", "JavaScript"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    fi
  fi
  
  # ============ 英文技术书测试 ============
  if [ "$filter" = "all" ] || [ "$filter" = "tech" ] || [ "$filter" = "en" ]; then
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${YELLOW}开始测试: 英文技术书${NC}"
    echo -e "${BLUE}============================================${NC}"
    
    test_search "Programming-Beginner" "programming beginner" "en" "beginner" "false" '["programming", "beginner"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    test_search "MachineLearning-English" "machine learning" "en" "intermediate" "false" '["machine learning", "AI"]'
    total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    
    if [ "$filter" != "quick" ]; then
      test_search "Programming-Intermediate" "programming" "en" "intermediate" "false" '["programming", "software"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "DeepLearning-English" "deep learning" "en" "advanced" "false" '["deep learning", "neural network"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "Database-English" "database" "en" "intermediate" "false" '["database", "SQL"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
      
      test_search "WebDev-English" "web development" "en" "intermediate" "false" '["web development", "frontend"]'
      total=$((total + 1)); [ "$LAST_COUNT" -ge 15 ] && passed=$((passed + 1)); sleep 1
    fi
  fi
  
  # ============ 测试总结 ============
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║              测试结果总结                   ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "总测试数: $total"
  echo -e "通过数量: ${GREEN}$passed${NC}"
  echo -e "失败数量: ${RED}$((total - passed))${NC}"
  echo -e "通过率: $(( passed * 100 / (total > 0 ? total : 1) ))%"
  echo ""
  echo -e "${GREEN}详细结果保存在: $RESULTS_DIR/${NC}"
}

# 运行
main "$@"
