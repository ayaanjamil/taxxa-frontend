'use client';

import { Fragment, type ReactNode } from 'react';
import type { Source } from '@/mock-data/answers';
import { type CiteIndex, looksLikeCiteId } from '@/lib/citations';

type Block =
  | { kind: 'h1' | 'h2' | 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] };

function parseBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    if (trimmed.startsWith('### ')) { blocks.push({ kind: 'h3', text: trimmed.slice(4) }); i++; continue; }
    if (trimmed.startsWith('## '))  { blocks.push({ kind: 'h2', text: trimmed.slice(3) }); i++; continue; }
    if (trimmed.startsWith('# '))   { blocks.push({ kind: 'h1', text: trimmed.slice(2) }); i++; continue; }

    if (/^[-*]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: 'p', text: paraLines.join(' ') });
  }
  return blocks;
}

interface RenderOpts {
  cites: CiteIndex;
  onCiteClick?: (chunkId: string) => void;
}

function renderInline(text: string, opts: RenderOpts, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*\n]+)\*)|(\[([^\]]+)\])/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={`${keyPrefix}-t-${key++}`}>{text.slice(last, m.index)}</Fragment>);
    if (m[1]) {
      out.push(<strong key={`${keyPrefix}-b-${key++}`} className="font-semibold text-foreground">{m[2]}</strong>);
    } else if (m[3]) {
      out.push(
        <code key={`${keyPrefix}-c-${key++}`} className="font-mono text-[11.5px] bg-muted px-1 py-px rounded">
          {m[4]}
        </code>,
      );
    } else if (m[5]) {
      out.push(<em key={`${keyPrefix}-i-${key++}`}>{m[6]}</em>);
    } else if (m[7]) {
      const id = m[8];
      if (looksLikeCiteId(id)) {
        const info = opts.cites.byId.get(id);
        if (info) {
          out.push(
            <CiteChip
              key={`${keyPrefix}-cite-${key++}`}
              index={info.index}
              citeId={id}
              label={info.label}
              source={info.source}
              onClick={opts.onCiteClick}
            />,
          );
        } else {
          // Cite hasn't been registered yet (regex split across tokens during stream).
          // Render a tiny placeholder; next render will pick it up.
          out.push(
            <sup key={`${keyPrefix}-cite-${key++}`} className="mx-px">
              <span className="inline-block min-w-[1.1rem] h-[1.1rem] rounded-[3px] bg-muted/60 animate-pulse" />
            </sup>,
          );
        }
      } else {
        out.push(<Fragment key={`${keyPrefix}-lit-${key++}`}>{m[0]}</Fragment>);
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<Fragment key={`${keyPrefix}-t-${key++}`}>{text.slice(last)}</Fragment>);
  return out;
}

function shorthand(citeId: string): string {
  const m = citeId.match(/#(chunk\d+)$/i);
  if (m) return `#${m[1]}`;
  return citeId.length > 10 ? '…' + citeId.slice(-9) : citeId;
}

interface CiteChipProps {
  index: number;
  citeId: string;
  label: string | null;
  source: Source | null;
  onClick?: (chunkId: string) => void;
}

function CiteChip({ index, citeId, label, source, onClick }: CiteChipProps) {
  const resolved = source !== null;
  const titleLines = [
    `[${index}] ${label ?? shorthand(citeId)}`,
    source ? source.label : 'Unmapped chunk',
  ];
  return (
    <sup className="mx-px">
      <button
        type="button"
        onClick={() => onClick?.(citeId)}
        title={titleLines.join('\n')}
        data-cite={index}
        className={
          resolved
            ? 'inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-[3px] text-[10px] font-mono font-medium leading-none bg-primary/12 text-primary hover:bg-primary/22 transition-colors cursor-pointer'
            : 'inline-flex items-center justify-center h-[1.1rem] px-1 rounded-[3px] text-[10px] font-mono font-medium leading-none bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-help'
        }
      >
        {resolved ? index : `${index}·${shorthand(citeId)}`}
      </button>
    </sup>
  );
}

interface MarkdownAnswerProps {
  raw: string;
  cites: CiteIndex;
  onCiteClick?: (chunkId: string) => void;
}

export function MarkdownAnswer({ raw, cites, onCiteClick }: MarkdownAnswerProps) {
  if (!raw.trim()) return null;
  const blocks = parseBlocks(raw);
  return (
    <div className="text-[13.5px] leading-relaxed text-foreground/90 space-y-3">
      {blocks.map((b, bi) => {
        const key = `b-${bi}`;
        if (b.kind === 'h1') {
          return (
            <h2 key={key} className="text-[15.5px] font-semibold tracking-tight mt-1 mb-1.5 text-foreground">
              {renderInline(b.text, { cites, onCiteClick }, key)}
            </h2>
          );
        }
        if (b.kind === 'h2') {
          return (
            <h3 key={key} className="font-semibold mt-2 mb-1 text-foreground/95 uppercase tracking-wide text-[11.5px]">
              {renderInline(b.text, { cites, onCiteClick }, key)}
            </h3>
          );
        }
        if (b.kind === 'h3') {
          return (
            <h4 key={key} className="text-[12.5px] font-semibold mt-1.5 mb-0.5 text-foreground/90">
              {renderInline(b.text, { cites, onCiteClick }, key)}
            </h4>
          );
        }
        if (b.kind === 'ul') {
          return (
            <ul key={key} className="list-disc list-outside pl-5 space-y-1 marker:text-muted-foreground/60">
              {b.items.map((it, ii) => (
                <li key={`${key}-li-${ii}`} className="leading-relaxed">
                  {renderInline(it, { cites, onCiteClick }, `${key}-li-${ii}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={key} className="leading-relaxed">
            {renderInline(b.text, { cites, onCiteClick }, key)}
          </p>
        );
      })}
    </div>
  );
}
