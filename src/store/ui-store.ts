'use client';

import { create } from 'zustand';

interface UiState {
  sectionCollapsed: Record<string, boolean>;
  corpusGroupOpen: Record<string, boolean>;
  toggleSection: (name: string) => void;
  toggleCorpusGroup: (id: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  sectionCollapsed: {},
  corpusGroupOpen: { statutes: true },

  toggleSection: (name) => {
    const { sectionCollapsed } = get();
    set({ sectionCollapsed: { ...sectionCollapsed, [name]: !sectionCollapsed[name] } });
  },

  toggleCorpusGroup: (id) => {
    const { corpusGroupOpen } = get();
    set({ corpusGroupOpen: { ...corpusGroupOpen, [id]: !corpusGroupOpen[id] } });
  },
}));
