export interface GraphNode {
  id: string;
  type: 'ARTICLE' | 'CLAUSE' | 'GUIDANCE_S' | 'GUIDANCE' | 'COURT_CASE';
  label: string;
  superseded: boolean;
  desc: string;
  /** Which sub-question's retrieval surfaced this node. null = graph-walk endpoint. */
  subIdx?: number | null;
}

/** Distinct border colors per sub-question index — graph-walk nodes get a neutral border. */
export const SUBQ_COLORS = [
  'oklch(64% 0.18 282)',  // purple
  'oklch(68% 0.15 52)',   // orange
  'oklch(63% 0.14 148)',  // green
  'oklch(72% 0.15 200)',  // cyan
  'oklch(70% 0.18 350)',  // pink
] as const;

export interface GraphEdge {
  source: string;
  target: string;
  relation: 'amends' | 'repeals' | 'references' | 'interpreted_by' | 'cites' | 'overrides';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ARTICLE:    { bg: 'oklch(62% 0.16 248)', border: 'oklch(54% 0.18 248)', text: '#fff' },
  CLAUSE:     { bg: 'oklch(62% 0.16 248)', border: 'oklch(54% 0.18 248)', text: '#fff' },
  GUIDANCE_S: { bg: 'oklch(62% 0.14 148)', border: 'oklch(55% 0.16 148)', text: '#fff' },
  GUIDANCE:   { bg: 'oklch(62% 0.14 148)', border: 'oklch(55% 0.16 148)', text: '#fff' },
  COURT_CASE: { bg: 'oklch(68% 0.15 52)',  border: 'oklch(59% 0.17 52)',  text: '#fff' },
};

export const SUPERSEDED_COLORS = {
  bg: 'oklch(22% 0.009 272)',
  border: 'oklch(28% 0.011 272)',
  text: 'oklch(44% 0.012 272)',
};

export const EDGE_COLORS: Record<string, string> = {
  amends:         'oklch(64% 0.18 282)',
  repeals:        'oklch(60% 0.18 22)',
  references:     'oklch(44% 0.012 272)',
  interpreted_by: 'oklch(62% 0.14 148)',
  cites:          'oklch(56% 0.13 200)',
  overrides:      'oklch(68% 0.15 52)',
};

export const SAMPLE_GRAPH: GraphData = {
  nodes: [
    { id: 'EPL_13',      type: 'ARTICLE',    label: '§13 EPL',       superseded: false, desc: 'Flat 32% source-tax rate for key personnel' },
    { id: 'EPL_14',      type: 'ARTICLE',    label: '§14 EPL',       superseded: true,  desc: '36-month validity (pre-2022, superseded)' },
    { id: 'EPL_14a',     type: 'ARTICLE',    label: '§14a EPL',      superseded: false, desc: '48-month validity — 2022 amendment' },
    { id: 'EPL_15',      type: 'ARTICLE',    label: '§15 EPL',       superseded: false, desc: '90-day application deadline' },
    { id: 'VH_2024_156', type: 'GUIDANCE_S', label: 'VH/2024/00156', superseded: false, desc: 'Employer documentation requirements' },
    { id: 'KHO_2021_88', type: 'COURT_CASE', label: 'KHO 2021:88',   superseded: false, desc: 'Late applications are rejected — precedent' },
  ],
  edges: [
    { source: 'EPL_14a',     target: 'EPL_14',  relation: 'amends' },
    { source: 'VH_2024_156', target: 'EPL_13',  relation: 'interpreted_by' },
    { source: 'VH_2024_156', target: 'EPL_14a', relation: 'cites' },
    { source: 'KHO_2021_88', target: 'EPL_15',  relation: 'overrides' },
    { source: 'EPL_13',      target: 'EPL_15',  relation: 'references' },
  ],
};
