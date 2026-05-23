'use client';

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useQueryStore } from '@/store/query-store';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { GraphPanel } from './graph-panel';
import { ChatPanel } from './chat-panel';

const TABS = [
  { id: 'traversal',  label: 'Traversal' },
  { id: 'all-nodes',  label: 'All nodes' },
  { id: 'amendments', label: 'Amendments' },
] as const;

export function WorkspacePanel() {
  const { latestGraph, activeTab, setActiveTab, messages } = useQueryStore();
  const graphRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const latestAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const nodeCount = latestAssistant?.role === 'assistant' ? latestAssistant.answer?.nodes : null;
  const hopCount  = latestAssistant?.role === 'assistant' ? latestAssistant.answer?.hops  : null;

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
      graphRef.current.style.width = `${Math.max(280, Math.min(startW.current + dx, parentW - 280))}px`;
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
    <div className="flex flex-1 overflow-hidden">
      {/* Graph side */}
      <div
        ref={graphRef}
        style={{ width: '52%' }}
        className="flex flex-col border-r overflow-hidden h-full"
      >
        {/* Graph header: sidebar trigger + tabs + status badge */}
        <div className="flex items-center h-9 border-b shrink-0 px-1 gap-1">
          <SidebarTrigger className="h-7 w-7 shrink-0" />
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'h-full px-2.5 text-xs transition-colors',
                activeTab === tab.id
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
          {nodeCount != null && (
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground pr-2">
              <span className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
              {nodeCount} nodes · {hopCount} hops
            </div>
          )}
        </div>

        <GraphPanel graphData={latestGraph} />
      </div>

      {/* Resize handle */}
      <div
        className="w-px bg-border hover:bg-primary/50 cursor-col-resize shrink-0 relative transition-colors after:absolute after:inset-y-0 after:-left-1 after:-right-1"
        onMouseDown={onMouseDown}
      />

      {/* Chat panel */}
      <ChatPanel />
    </div>
  );
}
