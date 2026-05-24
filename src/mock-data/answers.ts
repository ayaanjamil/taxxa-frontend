export interface SourceChunk {
  id: string;
  label: string;
  /** RRF/BM25 fused score from the retriever — null for graph-walk endpoints. */
  score: number | null;
  /** 1-based rank within its sub-question's retrieval — null for graph-walk endpoints. */
  rank: number | null;
}

export interface PhaseTiming {
  plan: number;
  retrieve: number;
  hops: number;
  synth: number;
}

export interface Source {
  id: string;
  label: string;
  dotType: 'finlex' | 'vh' | 'court' | 'repealed';
  tag: 'statute' | 'guidance' | 'court' | 'repealed';
  tagLabel: string;
  chunks: SourceChunk[];
  parentId: string;
  url: string | null;
}

export interface AnswerData {
  hops: number;
  nodes: number;
  timeMs: number;
  sources: Source[];
  phaseMs: PhaseTiming | null;
}

export const EMPTY_ANSWER: AnswerData = {
  hops: 0,
  nodes: 0,
  timeMs: 0,
  sources: [],
  phaseMs: null,
};

export const EXAMPLE_QUESTIONS = [
  'Mikä on pääomatuloveron enimmäisprosentti 2024?',
  'Kuinka kauan avainhenkilön verokortti on voimassa?',
  'Miten ALV käsitellään rakennusurakassa?',
];
