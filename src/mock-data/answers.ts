export interface CitationSpan {
  type: 'text' | 'cite';
  content: string;
}

export interface AnswerParagraph {
  spans: CitationSpan[];
}

export interface Source {
  id: string;
  label: string;
  dotType: 'finlex' | 'vh' | 'court' | 'repealed';
  tag: 'statute' | 'guidance' | 'court' | 'repealed';
  tagLabel: string;
}

export interface AnswerData {
  hops: number;
  nodes: number;
  timeMs: number;
  paragraphs: AnswerParagraph[];
  sources: Source[];
}

export const SAMPLE_ANSWER: AnswerData = {
  hops: 4,
  nodes: 6,
  timeMs: 1300,
  paragraphs: [
    {
      spans: [
        { type: 'text', content: 'Foreign specialists qualifying for key-personnel status under ' },
        { type: 'cite', content: '§13 EPL' },
        { type: 'text', content: ' are subject to a flat source-tax withholding rate of 32% on earned income, replacing the progressive schedule that would otherwise apply.' },
      ],
    },
    {
      spans: [
        { type: 'text', content: 'The tax card is valid for a maximum of 48 months from the start of Finnish employment ' },
        { type: 'cite', content: '§14a EPL' },
        { type: 'text', content: '. This was extended by the 2022 reform from the prior 36-month limit; the earlier version ' },
        { type: 'cite', content: '§14 EPL (pre-2022)' },
        { type: 'text', content: ' is now superseded. Reapplication rules were also clarified at that time.' },
      ],
    },
    {
      spans: [
        { type: 'text', content: 'To qualify, the specialist must receive a salary exceeding €5,800/month ' },
        { type: 'cite', content: '§13.1 EPL' },
        { type: 'text', content: ' and hold a technical, managerial, or expert role not ordinarily available in the Finnish labour market. The Tax Administration bulletin ' },
        { type: 'cite', content: 'VH/2024/00156' },
        { type: 'text', content: ' details the employer documentation required.' },
      ],
    },
    {
      spans: [
        { type: 'text', content: 'Applications must be filed within 90 days of the first working day ' },
        { type: 'cite', content: '§15 EPL' },
        { type: 'text', content: '. Late submissions are rejected, as confirmed in ' },
        { type: 'cite', content: 'KHO 2021:88' },
        { type: 'text', content: '.' },
      ],
    },
  ],
  sources: [
    { id: '§13 EPL',      label: 'Laki ulkomailta tulevan palkansaajan lähdeverosta', dotType: 'finlex',   tag: 'statute',  tagLabel: 'Statute' },
    { id: '§14a EPL',     label: 'Amendment 2022 — extended validity to 48 months',   dotType: 'finlex',   tag: 'statute',  tagLabel: 'Statute' },
    { id: '§14 EPL',      label: '36-month limit — superseded Jan 2022',               dotType: 'repealed', tag: 'repealed', tagLabel: 'Repealed' },
    { id: 'VH/2024/00156',label: 'Avainhenkilöverotus — soveltamisohje 2024',          dotType: 'vh',       tag: 'guidance', tagLabel: 'Guidance' },
    { id: 'KHO 2021:88',  label: 'Late application rejection — binding precedent',     dotType: 'court',    tag: 'court',    tagLabel: 'KHO' },
  ],
};

export const EXAMPLE_QUESTIONS = [
  'Mikä on pääomatuloveron enimmäisprosentti 2024?',
  'Kuinka kauan avainhenkilön verokortti on voimassa?',
  'Miten ALV käsitellään rakennusurakassa?',
];
