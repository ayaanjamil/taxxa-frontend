'use client';

import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { EMPTY_ANSWER, type AnswerData, type Source } from '@/mock-data/answers';
import { type GraphData, type GraphNode, type GraphEdge } from '@/mock-data/graph';
import { streamSSE } from '@/lib/sse';

const RAW_API = process.env.NEXT_PUBLIC_TAXXA_API ?? 'http://localhost:8000/ask';
const API_URL = /\/ask\/?$/.test(RAW_API) ? RAW_API : `${RAW_API.replace(/\/$/, '')}/ask`;
const CHAT_KEY_PREFIX = 'taxxa-chat:';
const META_KEY = 'taxxa-meta';

export type Mode = 'graph' | 'baseline';

export interface UserMessage {
  id: string;
  role: 'user';
  question: string;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  queryId: string;
  liveHops: number;
  answer: AnswerData;
  graph: GraphData;
  loading: boolean;
  rawText: string;
  subQuestions: string[];
  subDone: number[];
  mode: Mode;
}

export type Message = UserMessage | AssistantMessage;

export type GraphTab = 'traversal' | 'amendments';

export interface ChatMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatRecord {
  messages: Message[];
  latestGraph: GraphData | null;
  latestQueryId: string | null;
}

/**
 * Bumped on every "please pulse this parent-id in the graph" event from the
 * chat panel. The graph panel subscribes to it; the parentId is what to pulse.
 * Using a token (tick + value) lets repeated pulses on the same id still fire.
 */
export interface PulseTarget {
  parentId: string;
  tick: number;
}

interface QueryState {
  chatList: ChatMeta[];
  currentChatId: string | null;
  messages: Message[];
  input: string;
  activeTab: GraphTab;
  latestGraph: GraphData | null;
  latestQueryId: string | null;
  abortController: AbortController | null;
  mode: Mode;
  pulseTarget: PulseTarget | null;
  setInput: (q: string) => void;
  setActiveTab: (tab: GraphTab) => void;
  setMode: (mode: Mode) => void;
  /** Switch the store to a given chat id, loading its messages from IDB. */
  setCurrentChat: (chatId: string) => Promise<void>;
  /** Generate a new unique chat id (does not mutate state). */
  newChatId: () => string;
  sendMessage: () => Promise<void>;
  stopGeneration: () => void;
  deleteChat: (chatId: string) => Promise<void>;
  /** Ask the graph panel to briefly highlight the node with this parent id. */
  pulseNode: (parentId: string) => void;
}

const EMPTY_GRAPH: GraphData = { nodes: [], edges: [] };

interface PersistedMeta {
  chatList: ChatMeta[];
  mode: Mode;
}

const idbStorage: PersistStorage<PersistedMeta> = {
  getItem: async (name) => (await idbGet<StorageValue<PersistedMeta>>(name)) ?? null,
  setItem: async (name, value) => { await idbSet(name, value); },
  removeItem: async (name) => { await idbDel(name); },
};

function deriveTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'New chat';
  const t = (first as UserMessage).question.trim();
  return t.length > 70 ? t.slice(0, 67) + '…' : t;
}

async function persistChat(chatId: string, record: ChatRecord): Promise<void> {
  await idbSet(CHAT_KEY_PREFIX + chatId, record);
}

async function loadChat(chatId: string): Promise<ChatRecord | null> {
  const r = await idbGet<ChatRecord>(CHAT_KEY_PREFIX + chatId);
  return r ?? null;
}

export const useQueryStore = create<QueryState>()(persist((set, get) => ({
  chatList: [],
  currentChatId: null,
  messages: [],
  input: '',
  activeTab: 'traversal',
  latestGraph: null,
  latestQueryId: null,
  abortController: null,
  mode: 'graph',
  pulseTarget: null,

  setInput: (input) => set({ input }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setMode: (mode) => set({ mode }),

  pulseNode: (parentId) => set((state) => ({
    pulseTarget: { parentId, tick: (state.pulseTarget?.tick ?? 0) + 1 },
  })),

  newChatId: () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,

  setCurrentChat: async (chatId) => {
    // Cancel any in-flight stream from the previous chat.
    get().abortController?.abort();
    set({ currentChatId: chatId, abortController: null, input: '' });
    const record = await loadChat(chatId);
    if (record) {
      // Defensive: if a saved assistant message has loading: true (interrupted
      // refresh mid-stream), flip it to false so we don't show a stuck spinner.
      const cleanMessages = record.messages.map((m) =>
        m.role === 'assistant' && m.loading ? { ...m, loading: false } : m,
      );
      set({
        messages: cleanMessages,
        latestGraph: record.latestGraph,
        latestQueryId: record.latestQueryId,
      });
    } else {
      set({ messages: [], latestGraph: null, latestQueryId: null });
    }
  },

  deleteChat: async (chatId) => {
    await idbDel(CHAT_KEY_PREFIX + chatId);
    set((state) => ({
      chatList: state.chatList.filter((c) => c.id !== chatId),
      ...(state.currentChatId === chatId
        ? { currentChatId: null, messages: [], latestGraph: null, latestQueryId: null }
        : {}),
    }));
  },

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
    const { input, messages, abortController, mode, currentChatId, chatList } = get();
    const q = input.trim();
    if (!q || !currentChatId) return;

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
      subDone: [],
      mode,
    };

    const isFirstMessage = messages.length === 0;

    set({
      input: '',
      messages: [...messages, userMsg, loadingMsg],
      latestGraph: EMPTY_GRAPH,
      latestQueryId: queryId,
    });

    // Upsert the chat meta in the list so it appears immediately in the sidebar.
    const existing = chatList.find((c) => c.id === currentChatId);
    const now = Date.now();
    const meta: ChatMeta = existing
      ? { ...existing, title: isFirstMessage ? deriveTitle([userMsg]) : existing.title, updatedAt: now }
      : { id: currentChatId, title: deriveTitle([userMsg]), createdAt: now, updatedAt: now };
    set({
      chatList: [meta, ...chatList.filter((c) => c.id !== currentChatId)],
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

    const saveSnapshot = () => {
      const s = get();
      if (s.currentChatId !== currentChatId) return;
      void persistChat(currentChatId, {
        messages: s.messages,
        latestGraph: s.latestGraph,
        latestQueryId: s.latestQueryId,
      });
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
        } else if (evt.event === 'sub_done') {
          const idx = data.index as number;
          patch((m) => (m.subDone.includes(idx) ? m : { ...m, subDone: [...m.subDone, idx] }));
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
          const phaseMs = (data.phase_ms as { plan?: number; retrieve?: number; hops?: number; synth?: number } | undefined);
          patch((m) => ({
            ...m,
            loading: false,
            answer: {
              ...m.answer,
              timeMs: timeMs || m.answer.timeMs,
              phaseMs: phaseMs
                ? {
                    plan: phaseMs.plan ?? 0,
                    retrieve: phaseMs.retrieve ?? 0,
                    hops: phaseMs.hops ?? 0,
                    synth: phaseMs.synth ?? 0,
                  }
                : m.answer.phaseMs,
            },
          }));
          saveSnapshot();
          // Bump updatedAt
          set((state) => ({
            chatList: state.chatList.map((c) =>
              c.id === currentChatId ? { ...c, updatedAt: Date.now() } : c,
            ),
          }));
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        saveSnapshot();
        return;
      }
      console.error('SSE stream error:', err);
      patch((m) => ({
        ...m,
        loading: false,
        rawText: m.rawText || `**Error reaching backend.** ${(err as Error).message}`,
      }));
      saveSnapshot();
    } finally {
      set({ abortController: null });
    }
  },
}), {
  name: META_KEY,
  storage: idbStorage,
  partialize: (state): PersistedMeta => ({ chatList: state.chatList, mode: state.mode }),
  version: 2,
}));
