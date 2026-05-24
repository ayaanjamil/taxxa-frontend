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
}

export function ChunkSheet({ chunkId, open, onOpenChange }: ChunkSheetProps) {
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
        {loading && (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading chunk…
          </div>
        )}
        {error && (
          <div className="p-6 text-sm text-destructive">
            Failed to load chunk: {error}
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
                <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                  chunk {data.chunkIndex + 1}/{data.chunkTotal}
                </span>
              </div>
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
