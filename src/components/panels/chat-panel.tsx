'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Loader2, Square, ArrowUp, Network, FileSearch, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownAnswer } from '@/lib/markdown';
import { buildCiteIndex, type CiteIndex } from '@/lib/citations';
import { cn } from '@/lib/utils';
import { useQueryStore, type AssistantMessage, type Message, type Mode } from '@/store/query-store';
import type { Source } from '@/mock-data/answers';

const DOT_COLOR: Record<string, string> = {
  finlex:   'oklch(62% 0.16 248)',
  vh:       'oklch(63% 0.14 148)',
  court:    'oklch(68% 0.15 52)',
  repealed: 'oklch(30% 0.008 272)',
};

const TAG_CLASS: Record<string, string> = {
  statute:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  guidance: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  court:    'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  repealed: 'bg-muted text-muted-foreground',
};

function UserBubble({ question }: { question: string }) {
  return (
    <div className="flex justify-end">
      <div className="text-sm font-medium text-foreground/90 bg-muted/50 border rounded-md px-3 py-2 max-w-[88%] text-left leading-snug">
        {question}
      </div>
    </div>
  );
}

function MetaRow({ hops, nodes, timeMs, mode }: { hops: number; nodes: number; timeMs: number; mode: Mode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mb-3 flex-wrap">
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60">
        <span className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
        {mode === 'graph' ? 'Graph' : 'Baseline'}
      </span>
      <span><span className="text-foreground font-medium">{hops}</span> hops</span>
      <span className="text-muted-foreground/40">·</span>
      <span><span className="text-foreground font-medium">{nodes}</span> nodes</span>
      <span className="text-muted-foreground/40">·</span>
      <span><span className="text-foreground font-medium">{(timeMs / 1000).toFixed(1)}s</span></span>
    </div>
  );
}

function LoadingState({ message }: { message: AssistantMessage }) {
  const { subQuestions, subDone, liveHops, graph, rawText } = message;
  const doneSet = useMemo(() => new Set(subDone), [subDone]);
  const inFlight = subQuestions.length > 0 ? subDone.length : -1;
  const phase =
    rawText.length > 0 ? 'writing'
      : graph.edges.length > 0 ? 'traversing'
      : graph.nodes.length > 0 ? 'retrieving'
      : subQuestions.length > 0 ? 'planning'
      : 'thinking';

  const phaseLabel: Record<string, string> = {
    thinking:   'Thinking…',
    planning:   'Decomposing question',
    retrieving: 'Retrieving relevant statutes & guidance',
    traversing: 'Walking the citation graph',
    writing:    'Drafting answer',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        <span className="font-medium">{phaseLabel[phase]}</span>
        {(liveHops > 0 || graph.nodes.length > 0) && (
          <span className="font-mono text-muted-foreground/80">
            · {graph.nodes.length} nodes · {liveHops} hops
          </span>
        )}
      </div>

      {subQuestions.length > 0 && (
        <ol className="text-[12px] space-y-1.5 pl-0.5">
          {subQuestions.map((sq, i) => {
            const done = doneSet.has(i);
            const active = !done && i === inFlight;
            return (
              <li
                key={i}
                className={cn(
                  'flex gap-2 leading-snug transition-colors',
                  done ? 'text-foreground/85' : active ? 'text-foreground/95' : 'text-muted-foreground',
                )}
              >
                <span className="mt-0.5 shrink-0 w-3.5 h-3.5 inline-flex items-center justify-center">
                  {done ? (
                    <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                  ) : active ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground/60">{i + 1}.</span>
                  )}
                </span>
                <span className={done ? 'line-through decoration-muted-foreground/30 decoration-1' : ''}>{sq}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function groupSources(sources: Source[]): { key: string; label: string; rows: Source[] }[] {
  const groups = new Map<string, { label: string; rows: Source[] }>();
  for (const s of sources) {
    const key = s.label.trim() || s.id;
    const g = groups.get(key);
    if (g) g.rows.push(s);
    else groups.set(key, { label: key, rows: [s] });
  }
  return Array.from(groups, ([key, g]) => ({ key, ...g }));
}

function SourcesList({
  sources,
  cites,
  listRef,
}: {
  sources: Source[];
  cites: CiteIndex;
  listRef: React.RefObject<HTMLDivElement | null>;
}) {
  const grouped = useMemo(() => groupSources(sources), [sources]);
  if (!sources.length) return null;
  return (
    <div className="mt-5" ref={listRef}>
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
        Sources <span className="text-muted-foreground/60 normal-case font-mono">· {sources.length}</span>
      </p>
      <div className="flex flex-col gap-1.5">
        {grouped.map((g) => {
          const head = g.rows[0];
          const parentIds = g.rows.map((r) => r.parentId).filter(Boolean);
          // Collect footnote numbers from every parent in this group.
          const cited = parentIds.flatMap((pid) => cites.bySourceParentId.get(pid) ?? []);
          return (
            <div
              key={g.key}
              data-source-parents={parentIds.join(' ')}
              className="flex items-start gap-2 px-2.5 py-1.5 rounded-md border bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <div
                className="w-[5px] h-[5px] rounded-[1.5px] shrink-0 mt-1.5"
                style={{ background: DOT_COLOR[head.dotType] }}
              />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 min-w-0">
                  {cited.length > 0 && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 font-mono text-[10px] font-medium">
                      {cited.map((info) => (
                        <span
                          key={info.id}
                          title={info.id}
                          className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-[3px] bg-primary/12 text-primary"
                        >
                          {info.index}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="text-[12.5px] text-foreground/90 truncate">{g.label}</span>
                  <span
                    className={`shrink-0 text-[9.5px] font-mono font-medium uppercase tracking-wide px-1.5 py-px rounded ${TAG_CLASS[head.tag]}`}
                  >
                    {head.tagLabel}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {g.rows.map((row, i) => (
                    <span
                      key={row.id + i}
                      title={row.id}
                      className="font-mono text-[10px] text-muted-foreground bg-background border rounded px-1.5 py-0.5"
                    >
                      {row.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssistantBubble({ message }: { message: AssistantMessage }) {
  const { answer, rawText, loading } = message;
  const hasContent = rawText.length > 0 || answer.sources.length > 0;
  const sourcesRef = useRef<HTMLDivElement>(null);
  // Sentinel placed between the answer text and the sources list. While
  // streaming, we keep this in view so the latest text sits near the bottom
  // of the viewport — sources stay below the fold instead of yanking the
  // scroll past the answer.
  const answerEndRef = useRef<HTMLDivElement>(null);
  const cites = useMemo(() => buildCiteIndex(rawText, answer.sources), [rawText, answer.sources]);

  useEffect(() => {
    if (loading && rawText) {
      answerEndRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
    }
  }, [rawText, loading]);

  const handleCiteClick = useCallback((parentId: string | null) => {
    if (!parentId) return;
    const root = sourcesRef.current;
    if (!root) return;
    // Match against the space-separated list; some grouped rows hold multiple parentIds.
    const row = Array.from(root.querySelectorAll<HTMLDivElement>('[data-source-parents]'))
      .find((el) => (el.dataset.sourceParents ?? '').split(' ').includes(parentId));
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.remove('tx-source-pulse');
    // Force reflow so the animation re-triggers on consecutive clicks.
    void row.offsetWidth;
    row.classList.add('tx-source-pulse');
  }, []);

  if (loading && !hasContent) {
    return <LoadingState message={message} />;
  }

  return (
    <div>
      <MetaRow hops={answer.hops || message.liveHops} nodes={answer.nodes || message.graph.nodes.length} timeMs={answer.timeMs} mode={message.mode} />
      {loading && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span>Streaming…</span>
        </div>
      )}
      <MarkdownAnswer raw={rawText} cites={cites} onCiteClick={handleCiteClick} />
      <div ref={answerEndRef} aria-hidden className="h-px" />
      <SourcesList sources={answer.sources} cites={cites} listRef={sourcesRef} />
    </div>
  );
}

function ModeToggle({ mode, setMode, disabled }: { mode: Mode; setMode: (m: Mode) => void; disabled: boolean }) {
  return (
    <div className="inline-flex items-center rounded-md border bg-background p-0.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setMode('graph')}
        className={cn(
          'inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-[3px] transition-colors',
          mode === 'graph'
            ? 'bg-primary text-primary-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        title="Use graph traversal (cites + amends)"
      >
        <Network className="h-3 w-3" /> Graph
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setMode('baseline')}
        className={cn(
          'inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-[3px] transition-colors',
          mode === 'baseline'
            ? 'bg-primary text-primary-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        title="Pure BM25 + vector retrieval"
      >
        <FileSearch className="h-3 w-3" /> Baseline
      </button>
    </div>
  );
}

export function ChatPanel() {
  const { messages, input, setInput, sendMessage, stopGeneration, mode, setMode } = useQueryStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);
  const isLoading = messages.some((m): m is AssistantMessage => m.role === 'assistant' && m.loading);

  // Only scroll to bottom when a NEW message is added (not on every token
  // update). Mid-stream scrolling is handled by AssistantBubble's answerEndRef
  // so the view tracks the answer text, not the sources list below it.
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
      <div className="flex items-center justify-between px-3 h-9 border-b shrink-0">
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">Answer</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin">
        {messages.length === 0 && <EmptyState />}
        {messages.map((msg: Message) =>
          msg.role === 'user' ? (
            <UserBubble key={msg.id} question={msg.question} />
          ) : (
            <AssistantBubble key={msg.id} message={msg as AssistantMessage} />
          ),
        )}
      </div>

      <div className="border-t px-3 h-9 flex items-center gap-2 shrink-0">
        <ModeToggle mode={mode} setMode={setMode} disabled={isLoading} />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isLoading) sendMessage();
            }
          }}
          placeholder="Ask a follow-up…"
          className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
        />
        {isLoading ? (
          <Button size="xs" variant="outline" onClick={stopGeneration} className="shrink-0 gap-1" title="Stop generation">
            <Square className="h-3 w-3" /> Stop
          </Button>
        ) : (
          <Button size="xs" onClick={sendMessage} disabled={!input.trim()} className="shrink-0 gap-1">
            <ArrowUp className="h-3 w-3" /> Ask
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const { setInput, sendMessage } = useQueryStore();
  const examples = [
    'What withholding tax rate applies to a foreign specialist with key-personnel status?',
    'Mikä on pääomatuloveron enimmäisprosentti?',
    'Under the Finland–Austria treaty, what withholding rate applies to dividends?',
  ];
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-12 text-muted-foreground">
      <div className="space-y-1">
        <h2 className="text-foreground/80 text-sm font-medium">Ask a Finnish tax law question</h2>
        <p className="text-[11.5px]">Answers are grounded in Finlex statutes, Verohallinto guidance, and court rulings.</p>
      </div>
      <div className="flex flex-col gap-1.5 w-full max-w-md">
        {examples.map((q) => (
          <button
            key={q}
            onClick={() => { setInput(q); setTimeout(() => sendMessage(), 0); }}
            className="text-left text-[12px] px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-colors text-foreground/80"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
