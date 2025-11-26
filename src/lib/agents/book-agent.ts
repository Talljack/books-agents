import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { AgentState, Book, BookAnalysis, AgentMessage, SearchFilters } from "@/types/book";
import { searchNode } from "./nodes/search";
import { analyzeNode } from "./nodes/analyze";

// Define the state annotation
const BookAgentState = Annotation.Root({
  query: Annotation<string>(),
  filters: Annotation<SearchFilters | undefined>(),
  books: Annotation<Book[]>({
    default: () => [],
  }),
  selectedBook: Annotation<Book | undefined>(),
  analysis: Annotation<BookAnalysis | undefined>(),
  messages: Annotation<AgentMessage[]>({
    default: () => [],
  }),
  error: Annotation<string | undefined>(),
  action: Annotation<"search" | "analyze" | "recommend">(),
});

// Router function to determine next step
function routeAction(state: typeof BookAgentState.State): "search" | "analyze" | "end" {
  if (state.error) {
    return "end";
  }

  switch (state.action) {
    case "search":
      return "search";
    case "analyze":
      return "analyze";
    default:
      return "end";
  }
}

// Build the graph
export function createBookAgent() {
  const workflow = new StateGraph(BookAgentState)
    .addNode("search", searchNode)
    .addNode("analyze", analyzeNode)
    .addConditionalEdges("__start__", routeAction, {
      search: "search",
      analyze: "analyze",
      end: END,
    })
    .addEdge("search", END)
    .addEdge("analyze", END);

  return workflow.compile();
}

// Helper function to run a search
export async function runBookSearch(query: string, filters?: SearchFilters): Promise<AgentState> {
  const agent = createBookAgent();

  const result = await agent.invoke({
    query,
    filters,
    action: "search",
    books: [],
    messages: [
      {
        role: "user",
        content: `Search for: ${query}`,
        timestamp: new Date(),
      },
    ],
  });

  return result as AgentState;
}

// Helper function to run analysis
export async function runBookAnalysis(book: Book): Promise<AgentState> {
  const agent = createBookAgent();

  const result = await agent.invoke({
    query: "",
    selectedBook: book,
    action: "analyze",
    books: [],
    messages: [
      {
        role: "user",
        content: `Analyze: ${book.title}`,
        timestamp: new Date(),
      },
    ],
  });

  return result as AgentState;
}
