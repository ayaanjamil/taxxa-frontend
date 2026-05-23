'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryStore, type AssistantMessage } from '@/store/query-store';

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
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5 max-w-[85%] text-right leading-relaxed">
        {question}
      </div>
    </div>
  );
}

function AssistantBubble({ message }: { message: AssistantMessage }) {
  if (message.loading) {
    return (
      <div className="space-y-2 pt-1">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-[90%]" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[80%]" />
        <Skeleton className="h-3 w-[85%]" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[70%]" />
      </div>
    );
  }

  const { answer } = message;

  return (
    <div>
      {/* Meta */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mb-3">
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        <span className="text-primary font-medium">{answer.hops}</span> hops ·{' '}
        <span className="text-primary font-medium">{answer.nodes}</span> nodes ·{' '}
        <span className="text-primary font-medium">{(answer.timeMs / 1000).toFixed(1)}s</span>
      </div>

      {/* Body */}
      <div className="text-sm leading-relaxed font-light space-y-2.5">
        {answer.paragraphs.map((para, pi) => (
          <p key={pi}>
            {para.spans.map((span, si) =>
              span.type === 'cite' ? (
                <span
                  key={si}
                  className="inline-flex items-center px-1.5 py-px rounded text-[10.5px] font-mono font-medium bg-primary/10 text-primary cursor-default hover:bg-primary/20 transition-colors whitespace-nowrap"
                >
                  {span.content}
                </span>
              ) : (
                <span key={si}>{span.content}</span>
              )
            )}
          </p>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-border my-4" />

      {/* Sources */}
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Sources</p>
      <div className="flex flex-col gap-1.5">
        {answer.sources.map((src) => (
          <div
            key={src.id}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-muted/30 hover:bg-muted/60 transition-colors"
          >
            <div className="w-[5px] h-[5px] rounded-[1.5px] shrink-0" style={{ background: DOT_COLOR[src.dotType] }} />
            <span className="font-mono text-[10.5px] font-medium text-foreground whitespace-nowrap">{src.id}</span>
            <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{src.label}</span>
            <span className={`text-[9.5px] font-mono font-medium uppercase tracking-wide px-1.5 py-px rounded ${TAG_CLASS[src.tag]}`}>
              {src.tagLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { messages, input, setInput, sendMessage } = useQueryStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = messages.some(m => m.role === 'assistant' && (m as AssistantMessage).loading);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isLoading]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b shrink-0">
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">Answer</span>
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin">
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <UserBubble key={msg.id} question={msg.question} />
          ) : (
            <AssistantBubble key={msg.id} message={msg as AssistantMessage} />
          )
        )}
      </div>

      {/* Input bar */}
      <div className="border-t px-3 py-2 flex items-center gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask a follow-up…"
          className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
        />
        <Button size="xs" onClick={sendMessage} disabled={isLoading || !input.trim()} className="shrink-0">
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ask'}
        </Button>
      </div>
    </div>
  );
}
