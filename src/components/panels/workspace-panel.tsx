'use client';

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useQueryStore, type GraphTab, type AssistantMessage } from '@/store/query-store';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { GraphPanel } from './graph-panel';
import { ChatPanel } from './chat-panel';

const TABS: { id: GraphTab; label: string }[] = [
  { id: 'traversal',  label: 'Traversal' },
  { id: 'amendments', label: 'Amendments' },
];

export function WorkspacePanel() {
  const { latestGraph, latestQueryId, activeTab, setActiveTab, messages } = useQueryStore();
  const graphRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const latestAssistant = [...messages]
    .reverse()
    .find((m): m is AssistantMessage => m.role === 'assistant');
  const nodeCount = latestAssistant?.answer.nodes ?? latestAssistant?.graph.nodes.length ?? null;
  const hopCount  = latestAssistant?.answer.hops  ?? latestAssistant?.liveHops ?? null;
  const timeMs    = latestAssistant?.answer.timeMs ?? 0;

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startW.current = graphRef.current?.offsetWidth ?? 0;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !graphRef.current) return;
      const dx = ev.clientX - startX.current;
      const parentW = graphRef.current.parentElement?.offsetWidth ?? 0;
      graphRef.current.style.width = `${Math.max(320, Math.min(startW.current + dx, parentW - 320))}px`;
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
      <div
        ref={graphRef}
        className="flex flex-col overflow-hidden flex-1 md:flex-none md:w-[52%] min-h-0 border-b md:border-b-0 md:border-r"
      >
        <div className="flex items-center h-9 border-b shrink-0 px-1 gap-1">
          <SidebarTrigger className="h-7 w-7 shrink-0" />
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'h-full px-2.5 text-xs transition-colors relative',
                activeTab === tab.id
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute inset-x-2 bottom-0 h-px bg-primary" />
              )}
            </button>
          ))}
          {nodeCount != null && (
            <div className="ml-auto flex items-center gap-2 text-[11px] font-mono tabular-nums pr-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
                <span className="text-foreground">{nodeCount}</span>
                <span className="text-muted-foreground">nodes</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60">
                <span className="text-foreground">{hopCount ?? 0}</span>
                <span className="text-muted-foreground">hops</span>
              </span>
              {timeMs > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60">
                  <span className="text-foreground">{(timeMs / 1000).toFixed(1)}</span>
                  <span className="text-muted-foreground">s</span>
                </span>
              )}
            </div>
          )}
        </div>

        <GraphPanel graphData={latestGraph} queryId={latestQueryId} tab={activeTab} />
      </div>

      <div
        className="hidden md:block w-px bg-border hover:bg-primary/50 cursor-col-resize shrink-0 relative transition-colors after:absolute after:inset-y-0 after:-left-1 after:-right-1"
        onMouseDown={onMouseDown}
      />

      <ChatPanel />
    </div>
  );
}
