'use client';

import { Fragment, type ReactNode } from 'react';
import type { Source } from '@/mock-data/answers';

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

// Heuristic: real chunk-IDs in this corpus contain `#chunk` or `_` and are
// long. Tight regex avoids false positives like "[note]" or "[1]".
function looksLikeCiteId(s: string): boolean {
  if (s.length < 6) return false;
  if (/^\d+$/.test(s)) return false;
  return s.includes('#chunk') || /_/.test(s);
}

export interface CiteResolver {
  /** Returns [index, source] where index is 1-based, or [null, null] if unresolved. */
  resolve: (citeId: string) => [number | null, Source | null];
}

interface RenderOpts {
  cite: CiteResolver;
  onCiteClick?: (parentId: string | null) => void;
}

function renderInline(text: string, opts: RenderOpts, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Combined pattern: **bold** | *italic* | `code` | [cite]
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
        const [idx, src] = opts.cite.resolve(id);
        out.push(
          <CiteChip
            key={`${keyPrefix}-cite-${key++}`}
            index={idx}
            citeId={id}
            source={src}
            onClick={opts.onCiteClick}
          />,
        );
      } else {
        out.push(<Fragment key={`${keyPrefix}-lit-${key++}`}>{m[0]}</Fragment>);
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<Fragment key={`${keyPrefix}-t-${key++}`}>{text.slice(last)}</Fragment>);
  return out;
}

interface CiteChipProps {
  index: number | null;
  citeId: string;
  source: Source | null;
  onClick?: (parentId: string | null) => void;
}

function CiteChip({ index, citeId, source, onClick }: CiteChipProps) {
  const label = index ?? '?';
  const title = source ? `${source.id} — ${source.label}` : citeId;
  return (
    <sup className="mx-px">
      <button
        type="button"
        onClick={() => onClick?.(source?.parentId ?? null)}
        title={title}
        data-cite={index ?? ''}
        className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-[3px] text-[10px] font-mono font-medium leading-none bg-primary/12 text-primary hover:bg-primary/22 transition-colors cursor-pointer"
      >
        {label}
      </button>
    </sup>
  );
}

interface MarkdownAnswerProps {
  raw: string;
  sources: Source[];
  onCiteClick?: (parentId: string | null) => void;
}

/**
 * Build a stable {chunkId -> source-row-index} map. Sources earlier in the
 * list get lower indices, so footnote numbers track source order, not text
 * appearance order — predictable for the reader scanning the sources panel.
 */
function buildCiteResolver(sources: Source[]): CiteResolver {
  const chunkToSourceIdx = new Map<string, number>();
  sources.forEach((s, i) => {
    for (const cid of s.chunkIds ?? []) {
      if (!chunkToSourceIdx.has(cid)) chunkToSourceIdx.set(cid, i);
    }
  });
  return {
    resolve: (citeId) => {
      const idx = chunkToSourceIdx.get(citeId);
      if (idx === undefined) return [null, null];
      return [idx + 1, sources[idx]];
    },
  };
}

export function MarkdownAnswer({ raw, sources, onCiteClick }: MarkdownAnswerProps) {
  if (!raw.trim()) return null;
  const blocks = parseBlocks(raw);
  const cite = buildCiteResolver(sources);

  return (
    <div className="text-[13.5px] leading-relaxed text-foreground/90 space-y-3">
      {blocks.map((b, bi) => {
        const key = `b-${bi}`;
        if (b.kind === 'h1') {
          return (
            <h2 key={key} className="text-[15.5px] font-semibold tracking-tight mt-1 mb-1.5 text-foreground">
              {renderInline(b.text, { cite, onCiteClick }, key)}
            </h2>
          );
        }
        if (b.kind === 'h2') {
          return (
            <h3 key={key} className="text-[13.5px] font-semibold tracking-tight mt-2 mb-1 text-foreground/95 uppercase tracking-wide text-[11.5px]">
              {renderInline(b.text, { cite, onCiteClick }, key)}
            </h3>
          );
        }
        if (b.kind === 'h3') {
          return (
            <h4 key={key} className="text-[12.5px] font-semibold mt-1.5 mb-0.5 text-foreground/90">
              {renderInline(b.text, { cite, onCiteClick }, key)}
            </h4>
          );
        }
        if (b.kind === 'ul') {
          return (
            <ul key={key} className="list-disc list-outside pl-5 space-y-1 marker:text-muted-foreground/60">
              {b.items.map((it, ii) => (
                <li key={`${key}-li-${ii}`} className="leading-relaxed">
                  {renderInline(it, { cite, onCiteClick }, `${key}-li-${ii}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={key} className="leading-relaxed">
            {renderInline(b.text, { cite, onCiteClick }, key)}
          </p>
        );
      })}
    </div>
  );
}
