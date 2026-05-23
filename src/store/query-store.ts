'use client';

import { create } from 'zustand';
import { EMPTY_ANSWER, type AnswerData, type Source } from '@/mock-data/answers';
import { type GraphData, type GraphNode, type GraphEdge } from '@/mock-data/graph';
import { streamSSE } from '@/lib/sse';

const API_URL = process.env.NEXT_PUBLIC_TAXXA_API ?? 'http://localhost:8000/ask';

export type Mode = 'graph' | 'baseline';

export interface UserMessage {
  id: string;
  role: 'user';
  question: string;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  /** Identifies which query this message belongs to — drives graph reset. */
  queryId: string;
  /** Live in-flight hop count for the spinner; final value lives on answer.hops. */
  liveHops: number;
  answer: AnswerData;
  graph: GraphData;
  loading: boolean;
  /** Accumulated synthesis token buffer — rendered as markdown. */
  rawText: string;
  subQuestions: string[];
  mode: Mode;
}

export type Message = UserMessage | AssistantMessage;

export type GraphTab = 'traversal' | 'amendments';

interface QueryState {
  messages: Message[];
  input: string;
  recentQueries: string[];
  activeTab: GraphTab;
  latestGraph: GraphData | null;
  latestQueryId: string | null;
  abortController: AbortController | null;
  mode: Mode;
  setInput: (q: string) => void;
  setActiveTab: (tab: GraphTab) => void;
  setMode: (mode: Mode) => void;
  sendMessage: () => Promise<void>;
  stopGeneration: () => void;
  loadRecent: (q: string) => void;
}

const EMPTY_GRAPH: GraphData = { nodes: [], edges: [] };

export const useQueryStore = create<QueryState>((set, get) => ({
  messages: [],
  input: '',
  recentQueries: [
    'What withholding tax rate applies to a foreign specialist with key-personnel status, and how long is the tax card valid?',
    'Mikä on pääomatuloveron enimmäisprosentti 2024?',
    'Under the Finland-Austria double tax treaty, what withholding rate applies to dividends?',
  ],
  activeTab: 'traversal',
  latestGraph: null,
  latestQueryId: null,
  abortController: null,
  mode: 'graph',

  setInput: (input) => set({ input }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setMode: (mode) => set({ mode }),

  stopGeneration: () => {
    const ctrl = get().abortController;
    if (!ctrl) return;
    ctrl.abort();
    set((state) => ({
      abortController: null,
      messages: state.messages.map((m) =>
        m.role === 'assistant' && m.loading ? { ...m, loading: false } : m,
      ),
    }));
  },

  sendMessage: async () => {
    const { input, messages, recentQueries, abortController, mode } = get();
    const q = input.trim();
    if (!q) return;

    abortController?.abort();

    const queryId = String(Date.now());
    const userId = `${queryId}-u`;
    const assistantId = `${queryId}-a`;

    const userMsg: UserMessage = { id: userId, role: 'user', question: q };
    const loadingMsg: AssistantMessage = {
      id: assistantId,
      role: 'assistant',
      queryId,
      liveHops: 0,
      answer: { ...EMPTY_ANSWER },
      graph: { nodes: [], edges: [] },
      loading: true,
      rawText: '',
      subQuestions: [],
      mode,
    };

    set({
      input: '',
      messages: [...messages, userMsg, loadingMsg],
      recentQueries: [q, ...recentQueries.filter((r) => r !== q)].slice(0, 8),
      latestGraph: EMPTY_GRAPH,
      latestQueryId: queryId,
    });

    const ctrl = new AbortController();
    set({ abortController: ctrl });

    const patch = (fn: (m: AssistantMessage) => AssistantMessage) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantId && m.role === 'assistant' ? fn(m as AssistantMessage) : m,
        ),
      }));
    };

    const syncLatestGraph = () => {
      const cur = get().messages.find((x) => x.id === assistantId);
      if (cur && cur.role === 'assistant') set({ latestGraph: cur.graph });
    };

    try {
      for await (const evt of streamSSE(
        API_URL,
        {
          question: q,
          use_graph: mode === 'graph',
          hop_delay_ms: 200,
          max_hops: 30,
        },
        ctrl.signal,
      )) {
        const data = evt.data as Record<string, unknown>;

        if (evt.event === 'plan') {
          patch((m) => ({ ...m, subQuestions: (data.sub_questions as string[]) ?? [] }));
        } else if (evt.event === 'entry') {
          const incoming = data.nodes as GraphNode[];
          patch((m) => {
            const existing = new Set(m.graph.nodes.map((n) => n.id));
            const merged = [...m.graph.nodes, ...incoming.filter((n) => !existing.has(n.id))];
            return { ...m, graph: { nodes: merged, edges: m.graph.edges } };
          });
          syncLatestGraph();
        } else if (evt.event === 'hop') {
          const edge: GraphEdge = {
            source: data.from as string,
            target: data.to as string,
            relation: data.relation as GraphEdge['relation'],
          };
          patch((m) => ({
            ...m,
            liveHops: m.liveHops + 1,
            graph: { nodes: m.graph.nodes, edges: [...m.graph.edges, edge] },
          }));
          syncLatestGraph();
        } else if (evt.event === 'sources') {
          const sources = (data.sources as Source[]) ?? [];
          const hops = (data.hops as number) ?? 0;
          const nodesCount = (data.nodes as number) ?? 0;
          const timeMs = (data.time_ms as number) ?? 0;
          patch((m) => ({
            ...m,
            answer: { ...m.answer, sources, hops, nodes: nodesCount, timeMs },
          }));
        } else if (evt.event === 'token') {
          const text = data.text as string;
          patch((m) => ({ ...m, rawText: m.rawText + text }));
        } else if (evt.event === 'done') {
          const timeMs = (data.time_ms as number) ?? 0;
          patch((m) => ({
            ...m,
            loading: false,
            answer: { ...m.answer, timeMs: timeMs || m.answer.timeMs },
          }));
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('SSE stream error:', err);
      patch((m) => ({
        ...m,
        loading: false,
        rawText: m.rawText || `**Error reaching backend.** ${(err as Error).message}`,
      }));
    } finally {
      set({ abortController: null });
    }
  },

  loadRecent: (q) => {
    set({ input: q });
    setTimeout(() => get().sendMessage(), 0);
  },
}));
