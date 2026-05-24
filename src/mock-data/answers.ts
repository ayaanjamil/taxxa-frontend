export interface SourceChunk {
  id: string;
  label: string;
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
}

export const EMPTY_ANSWER: AnswerData = {
  hops: 0,
  nodes: 0,
  timeMs: 0,
  sources: [],
};

export const EXAMPLE_QUESTIONS = [
  'Mikä on pääomatuloveron enimmäisprosentti 2024?',
  'Kuinka kauan avainhenkilön verokortti on voimassa?',
  'Miten ALV käsitellään rakennusurakassa?',
];
