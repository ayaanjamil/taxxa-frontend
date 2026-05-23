export interface EvalScore {
  label: string;
  pct: number;
  color: 'green' | 'amber' | 'red';
}

export const EVAL_SCORES: EvalScore[] = [
  { label: 'Basic',  pct: 61, color: 'green' },
  { label: 'Medium', pct: 38, color: 'amber' },
  { label: 'Hard',   pct: 22, color: 'red' },
];

export const EVAL_META = '83 QA pairs · last run 14:32';
