'use client';

import { create } from 'zustand';
import { SAMPLE_ANSWER, type AnswerData } from '@/mock-data/answers';
import { SAMPLE_GRAPH, type GraphData } from '@/mock-data/graph';

export interface UserMessage {
  id: string;
  role: 'user';
  question: string;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  answer: AnswerData;
  graph: GraphData;
  loading: boolean;
}

export type Message = UserMessage | AssistantMessage;

interface QueryState {
  messages: Message[];
  input: string;
  recentQueries: string[];
  activeTab: 'traversal' | 'all-nodes' | 'amendments';
  latestGraph: GraphData | null;
  setInput: (q: string) => void;
  setActiveTab: (tab: 'traversal' | 'all-nodes' | 'amendments') => void;
  sendMessage: () => void;
  loadRecent: (q: string) => void;
}

const INITIAL_QUESTION = 'What withholding tax rate applies to a foreign specialist with key-personnel status, and how long is the tax card valid?';

export const useQueryStore = create<QueryState>((set, get) => ({
  messages: [
    { id: '0', role: 'user', question: INITIAL_QUESTION },
    { id: '1', role: 'assistant', answer: SAMPLE_ANSWER, graph: SAMPLE_GRAPH, loading: false },
  ],
  input: '',
  recentQueries: [
    INITIAL_QUESTION,
    'Mikä on pääomatuloveron enimmäisprosentti 2024?',
    'Miten ALV käsitellään rakennusurakassa?',
  ],
  activeTab: 'traversal',
  latestGraph: SAMPLE_GRAPH,

  setInput: (input) => set({ input }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  sendMessage: () => {
    const { input, messages, recentQueries } = get();
    const q = input.trim();
    if (!q) return;

    const userId = String(Date.now());
    const assistantId = String(Date.now() + 1);

    const userMsg: UserMessage = { id: userId, role: 'user', question: q };
    const loadingMsg: AssistantMessage = {
      id: assistantId, role: 'assistant',
      answer: SAMPLE_ANSWER, graph: SAMPLE_GRAPH, loading: true,
    };

    set({
      input: '',
      messages: [...messages, userMsg, loadingMsg],
      recentQueries: [q, ...recentQueries.filter(r => r !== q)].slice(0, 8),
    });

    setTimeout(() => {
      set((state) => ({
        messages: state.messages.map(m =>
          m.id === assistantId
            ? { ...m, loading: false }
            : m
        ),
        latestGraph: SAMPLE_GRAPH,
      }));
    }, 1350);
  },

  loadRecent: (q) => {
    set({ input: q });
    setTimeout(() => get().sendMessage(), 0);
  },
}));
