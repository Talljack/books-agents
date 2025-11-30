# LangGraph 流程图 (Mermaid 格式)

## 1. 整体系统架构

```mermaid
graph TB
    subgraph Frontend["前端 (Next.js)"]
        UI[Chat Interface]
        State[前端状态管理]
    end

    subgraph API["API Layer"]
        Route["/api/chat"]
    end

    subgraph Agent["LangGraph Agent"]
        Graph[State Graph]
        Nodes[节点函数]
        Router[条件路由]
    end

    subgraph External["外部服务"]
        LLM[LLM API]
        Google[Google Books]
        OpenLib[Open Library]
    end

    UI --> Route
    Route --> Graph
    Graph --> Nodes
    Nodes --> Router
    Router --> Nodes
    Nodes --> LLM
    Nodes --> Google
    Nodes --> OpenLib
    Graph --> Route
    Route --> UI
```

## 2. 状态机流转图

```mermaid
stateDiagram-v2
    [*] --> analyze_intent: 用户发送消息

    analyze_intent --> ask_question: needsMoreInfo = true
    analyze_intent --> search_books: needsMoreInfo = false

    ask_question --> [*]: 等待用户回复

    search_books --> present_results: 搜索成功
    search_books --> search_books: 搜索失败 (重试)

    present_results --> [*]: 返回结果

    note right of analyze_intent
        分析用户意图
        提取偏好信息
        判断信息完整性
    end note

    note right of ask_question
        生成澄清问题
        引导用户提供更多信息
    end note

    note right of search_books
        构建搜索查询
        调用多个数据源
        合并去重结果
    end note

    note right of present_results
        格式化结果
        生成推荐说明
    end note
```

## 3. 多轮对话时序图

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant A as API
    participant G as LangGraph
    participant L as LLM
    participant S as 搜索服务

    %% 第一轮
    U->>F: "找AI相关书籍"
    F->>A: POST /api/chat
    A->>G: invoke(state)
    G->>L: 分析意图
    L-->>G: needsMoreInfo=true
    G->>L: 生成问题
    L-->>G: "哪个方向？"
    G-->>A: response
    A-->>F: {message: "..."}
    F-->>U: 显示问题

    %% 第二轮
    U->>F: "机器学习方向"
    F->>A: POST /api/chat
    A->>G: invoke(state + history)
    G->>L: 分析意图
    L-->>G: needsMoreInfo=true
    G->>L: 生成问题
    L-->>G: "技术水平？"
    G-->>A: response
    A-->>F: {message: "..."}
    F-->>U: 显示问题

    %% 第三轮
    U->>F: "中级开发者"
    F->>A: POST /api/chat
    A->>G: invoke(state + history)
    G->>L: 分析意图
    L-->>G: needsMoreInfo=false
    G->>S: search("机器学习 中级")
    S-->>G: books[]
    G->>L: 生成推荐说明
    L-->>G: "这些书适合..."
    G-->>A: {message, books}
    A-->>F: {message, books}
    F-->>U: 显示书籍
```

## 4. 节点处理流程图

```mermaid
flowchart TD
    subgraph AnalyzeIntent["analyze_intent 节点"]
        A1[接收用户消息]
        A2[调用 LLM 分析]
        A3{提取到足够信息?}
        A4[更新 preferences]
        A5[设置 needsMoreInfo]

        A1 --> A2 --> A3
        A3 -->|是| A4
        A3 -->|否| A5
        A4 --> A6[返回状态]
        A5 --> A6
    end

    subgraph AskQuestion["ask_question 节点"]
        B1[获取缺失信息列表]
        B2[构建提问 prompt]
        B3[调用 LLM 生成问题]
        B4[添加 AI 消息]

        B1 --> B2 --> B3 --> B4
    end

    subgraph SearchBooks["search_books 节点"]
        C1[构建搜索查询]
        C2[并行调用 API]
        C3[Google Books]
        C4[Open Library]
        C5[合并结果]
        C6[去重排序]

        C1 --> C2
        C2 --> C3
        C2 --> C4
        C3 --> C5
        C4 --> C5
        C5 --> C6
    end

    subgraph PresentResults["present_results 节点"]
        D1{有搜索结果?}
        D2[生成推荐说明]
        D3[返回空结果提示]
        D4[格式化输出]

        D1 -->|是| D2 --> D4
        D1 -->|否| D3
    end
```

## 5. 条件路由决策图

```mermaid
flowchart TD
    subgraph Router["routeAfterAnalysis 路由函数"]
        R1[检查状态]
        R2{有错误?}
        R3{重试次数 < 3?}
        R4{needsMoreInfo?}
        R5[返回 analyze_intent]
        R6[返回 ask_question]
        R7[返回 search_books]

        R1 --> R2
        R2 -->|是| R3
        R3 -->|是| R5
        R3 -->|否| R7
        R2 -->|否| R4
        R4 -->|是| R6
        R4 -->|否| R7
    end
```

## 6. 状态数据流图

```mermaid
flowchart LR
    subgraph State["BookAgentState"]
        direction TB
        S1[userMessage]
        S2[messages: Message[]]
        S3[preferences: {...}]
        S4[books: Book[]]
        S5[needsMoreInfo: boolean]
        S6[currentPhase: string]
    end

    subgraph Nodes
        N1[analyze_intent]
        N2[ask_question]
        N3[search_books]
        N4[present_results]
    end

    S1 --> N1
    S2 --> N1
    N1 -->|更新| S3
    N1 -->|更新| S5

    S2 --> N2
    S5 --> N2
    N2 -->|追加| S2

    S3 --> N3
    N3 -->|设置| S4

    S4 --> N4
    N4 -->|追加| S2
```

## 7. 工具调用流程

```mermaid
flowchart TD
    subgraph ToolCall["Function Calling 流程"]
        T1[LLM 决定调用工具]
        T2[生成 tool_calls]
        T3[路由到 tools 节点]
        T4[执行 search_books 工具]
        T5[返回结果到状态]
        T6[继续到 respond 节点]

        T1 --> T2 --> T3 --> T4 --> T5 --> T6
    end

    subgraph Tools["可用工具"]
        Tool1["search_books
        - query: string
        - maxResults: number"]
    end

    T4 --> Tools
    Tools --> T5
```

## 8. 错误处理流程

```mermaid
flowchart TD
    subgraph ErrorHandling["错误处理"]
        E1[执行操作]
        E2{成功?}
        E3[返回结果]
        E4{重试次数 < 3?}
        E5[增加重试计数]
        E6[等待退避时间]
        E7[返回错误状态]
        E8[使用降级结果]

        E1 --> E2
        E2 -->|是| E3
        E2 -->|否| E4
        E4 -->|是| E5 --> E6 --> E1
        E4 -->|否| E7 --> E8
    end
```

---

## 如何查看这些图

### 方法 1: VS Code 插件

安装 "Markdown Preview Mermaid Support" 插件，然后预览此文件。

### 方法 2: 在线工具

复制 Mermaid 代码到 https://mermaid.live/ 查看。

### 方法 3: GitHub

GitHub 原生支持 Mermaid 图表，直接在 GitHub 上查看此文件。

### 方法 4: Notion

将 Mermaid 代码块粘贴到 Notion，会自动渲染。
