'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// Lightweight visually-hidden span — avoids pulling in @radix-ui/react-visually-hidden
// just to satisfy Radix's a11y requirement that a Dialog always has a Title.
function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    >
      {children}
    </span>
  );
}

const API_BASE = (process.env.NEXT_PUBLIC_TAXXA_API ?? 'http://localhost:8000/ask').replace(/\/ask\/?$/, '');

interface ChunkPayload {
  id: string;
  parentId: string;
  title: string;
  statute: string | null;
  section: string | null;
  date: string | null;
  source: string;
  type: string;
  chunkIndex: number;
  chunkTotal: number;
  text: string;
  filePath: string | null;
  label: string;
  url: string | null;
}

interface ChunkSheetProps {
  chunkId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Retrieval score from the most recent ask — null for graph-walk endpoints. */
  score?: number | null;
  /** 1-based rank within its sub-question's retrieval — null for graph-walk endpoints. */
  rank?: number | null;
}

export function ChunkSheet({ chunkId, open, onOpenChange, score, rank }: ChunkSheetProps) {
  const [data, setData] = useState<ChunkPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !chunkId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`${API_BASE}/chunk?id=${encodeURIComponent(chunkId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((j) => { if (!cancelled) setData(j as ChunkPayload); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chunkId, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!max-w-xl w-[42rem] sm:!max-w-xl">
        {/* Title is required by Radix a11y; visually hidden while loading/erroring. */}
        {!data && (
          <VisuallyHidden>
            <SheetTitle>{loading ? 'Loading chunk' : 'Chunk preview'}</SheetTitle>
          </VisuallyHidden>
        )}
        {loading && (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading chunk…
          </div>
        )}
        {error && (
          <div className="p-6 text-sm">
            <p className="text-destructive font-medium mb-2">Failed to load chunk</p>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-muted-foreground text-[11px] mt-3">
              Is the backend running? The <span className="font-mono">/chunk</span> endpoint is new — restart uvicorn if you upgraded recently.
            </p>
          </div>
        )}
        {data && (
          <>
            <SheetHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-[11px] font-medium bg-primary/12 text-primary px-1.5 py-0.5 rounded">
                  {data.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {data.source} · {data.type}
                </span>
                {data.date && (
                  <span className="text-[10px] text-muted-foreground font-mono">{data.date}</span>
                )}
                <span className="text-[10px] text-muted-foreground font-mono ml-auto mr-8">
                  chunk {data.chunkIndex + 1}/{data.chunkTotal}
                </span>
              </div>
              {(score != null || rank != null) && (
                <div className="flex items-center gap-2 mb-1">
                  {rank != null && (
                    <span
                      className="font-mono text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded"
                      title="1-based rank within this sub-question's retrieval (RRF-fused)"
                    >
                      rank #{rank}
                    </span>
                  )}
                  {score != null && (
                    <span
                      className="font-mono text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded"
                      title="Reciprocal-Rank Fusion score after Vero/treaty boosts"
                    >
                      score {score.toFixed(3)}
                    </span>
                  )}
                  {score == null && rank == null && (
                    <span className="text-[10px] text-muted-foreground italic">Graph-walk endpoint (no retrieval score)</span>
                  )}
                </div>
              )}
              <SheetTitle className="text-sm leading-snug pr-8">{data.title}</SheetTitle>
              <SheetDescription className="font-mono text-[10.5px] break-all">
                {data.id}
              </SheetDescription>
              {data.url && (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline w-fit"
                >
                  <ExternalLink className="h-3 w-3" />
                  Search original on {data.source === 'vero' ? 'vero.fi' : 'finlex.fi'}
                </a>
              )}
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                {data.text}
              </div>
              {data.filePath && (
                <p className="mt-4 pt-3 border-t text-[10px] font-mono text-muted-foreground break-all">
                  {data.filePath}
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
