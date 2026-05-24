'use client';

import { useEffect, useState } from 'react';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const API_BASE = (process.env.NEXT_PUBLIC_TAXXA_API ?? 'http://localhost:8000/ask').replace(/\/ask\/?$/, '');

const COLOR_CLASS: Record<string, string> = {
  green: 'bg-emerald-500 dark:bg-emerald-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  red:   'bg-red-500 dark:bg-red-400',
};

const TEXT_CLASS: Record<string, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red:   'text-red-600 dark:text-red-400',
};

interface Bucket {
  label: string;
  pct: number;
  n: number;
  color: 'green' | 'amber' | 'red';
}

interface EvalPayload {
  available: boolean;
  filename?: string;
  mtime?: number;
  total?: number;
  overallFactCoverage?: number | null;
  overallCitationRate?: number | null;
  buckets?: Bucket[];
}

function relativeTime(epochSeconds: number): string {
  const s = Math.max(1, Math.floor((Date.now() / 1000 - epochSeconds)));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NavEval() {
  const [data, setData] = useState<EvalPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      fetch(`${API_BASE}/eval/latest`)
        .then((r) => r.json())
        .then((j) => { if (!cancelled) { setData(j as EvalPayload); setErr(null); } })
        .catch((e: Error) => { if (!cancelled) setErr(e.message); });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (err) return null;
  if (!data) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Eval</SidebarGroupLabel>
        <SidebarGroupContent className="px-2 pb-1">
          <div className="h-[60px] animate-pulse bg-muted/50 rounded" />
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }
  if (!data.available || !data.buckets?.length) {
    return null;
  }

  const meta = `${data.total} QA · ${data.mtime ? relativeTime(data.mtime) : 'just now'}`;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Eval</SidebarGroupLabel>
      <SidebarGroupContent className="px-2 pb-1">
        <div className="flex flex-col gap-2">
          {data.buckets.map((score) => (
            <div key={score.label} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-11 shrink-0">{score.label}</span>
              <div className="flex-1 h-[3px] rounded-full bg-border overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', COLOR_CLASS[score.color])}
                  style={{ width: `${score.pct}%` }}
                />
              </div>
              <span className={cn('text-[10px] font-mono font-medium w-7 text-right shrink-0', TEXT_CLASS[score.color])}>
                {score.pct}%
              </span>
            </div>
          ))}
          <p className="text-[10.5px] text-muted-foreground mt-1" title={data.filename}>{meta}</p>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
