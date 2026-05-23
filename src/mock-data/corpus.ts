export interface CorpusLeaf {
  name: string;
  detail: string;
  color: 'blue' | 'green' | 'orange';
}

export interface CorpusGroup {
  id: string;
  label: string;
  color: 'blue' | 'green' | 'orange';
  count: number;
  children: CorpusLeaf[];
}

export const CORPUS_GROUPS: CorpusGroup[] = [
  {
    id: 'statutes',
    label: 'Statutes',
    color: 'blue',
    count: 4,
    children: [
      { name: 'AVL', detail: '§§ 1–246', color: 'blue' },
      { name: 'TVL', detail: '§§ 1–141', color: 'blue' },
      { name: 'EPL', detail: '§§ 1–22',  color: 'blue' },
      { name: 'KVL', detail: '§§ 1–68',  color: 'blue' },
    ],
  },
  {
    id: 'verohallinto',
    label: 'Verohallinto',
    color: 'green',
    count: 47,
    children: [
      { name: 'Ohjeet 2024', detail: '31', color: 'green' },
      { name: 'Ohjeet 2023', detail: '16', color: 'green' },
    ],
  },
  {
    id: 'court',
    label: 'Court rulings',
    color: 'orange',
    count: 18,
    children: [
      { name: 'KHO', detail: '12', color: 'orange' },
      { name: 'KKO', detail: '6',  color: 'orange' },
    ],
  },
];
