'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Maximize2, Download } from 'lucide-react';
import cytoscape, { Core } from 'cytoscape';
import { Button } from '@/components/ui/button';
import { type GraphData, NODE_COLORS, SUPERSEDED_COLORS, EDGE_COLORS } from '@/mock-data/graph';

interface GraphPanelProps {
  graphData: GraphData | null;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  html: string;
}

export function GraphPanel({ graphData }: GraphPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const setTooltip = useCallback((state: TooltipState) => {
    const el = tooltipRef.current;
    if (!el) return;
    if (!state.visible) { el.style.opacity = '0'; return; }
    el.innerHTML = state.html;
    el.style.left = `${state.x + 14}px`;
    el.style.top = `${state.y - 8}px`;
    el.style.opacity = '1';
  }, []);

  const fitGraph = useCallback(() => { cyRef.current?.fit(undefined, 36); }, []);

  useEffect(() => {
    if (!graphData || !containerRef.current) return;

    const container = containerRef.current;
    let cy: Core | null = null;
    let initialized = false;

    const elements = [
      ...graphData.nodes.map((n) => {
        const c = n.superseded ? SUPERSEDED_COLORS : (NODE_COLORS[n.type] ?? NODE_COLORS.ARTICLE);
        return { data: { id: n.id, label: n.label, type: n.type, superseded: n.superseded, desc: n.desc, bg: c.bg, border: c.border, textColor: c.text } };
      }),
      ...graphData.edges.map((e, i) => ({
        data: { id: `e${i}`, source: e.source, target: e.target, relation: e.relation, lineColor: EDGE_COLORS[e.relation] ?? EDGE_COLORS.references },
      })),
    ];

    const initCy = () => {
      if (initialized || !container.offsetWidth || !container.offsetHeight) return;
      initialized = true;

      cyRef.current?.destroy();
      cy = cytoscape({
        container,
        elements,
      layout: { name: 'breadthfirst', directed: true, padding: 36, spacingFactor: 1.5, avoidOverlap: true } as Parameters<Core['layout']>[0],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(bg)', 'border-color': 'data(border)', 'border-width': 1.5,
            color: 'data(textColor)', label: 'data(label)',
            'font-family': 'ui-monospace, monospace', 'font-size': '10.5px', 'font-weight': '500',
            'text-valign': 'center', 'text-halign': 'center',
            width: 'label', height: 26, padding: '0 11px',
            shape: 'round-rectangle', 'text-wrap': 'none',
            'transition-property': 'opacity, border-width, border-color', 'transition-duration': '0.15s',
          } as unknown as cytoscape.Css.Node,
        },
        { selector: 'node[?superseded]', style: { opacity: 0.5, 'border-style': 'dashed' } as unknown as cytoscape.Css.Node },
        { selector: 'node.highlighted', style: { 'border-width': 2.5, 'border-color': 'oklch(64% 0.18 282)', 'z-index': 10 } as unknown as cytoscape.Css.Node },
        {
          selector: 'edge',
          style: {
            'line-color': 'data(lineColor)', 'target-arrow-color': 'data(lineColor)',
            'target-arrow-shape': 'triangle', 'arrow-scale': 0.65,
            width: 1.5, 'curve-style': 'bezier', opacity: 0.75,
            label: 'data(relation)', 'font-family': 'sans-serif', 'font-size': '9px',
            'text-opacity': 0, 'text-background-color': 'var(--background)', 'text-background-opacity': 0,
            'transition-property': 'opacity, text-opacity, width', 'transition-duration': '0.15s',
          } as unknown as cytoscape.Css.Edge,
        },
        { selector: 'edge.highlighted', style: { opacity: 1, width: 2.5, 'text-opacity': 1, 'text-background-opacity': 1, 'text-background-padding': '3px', 'z-index': 10 } as unknown as cytoscape.Css.Edge },
        { selector: 'node.faded, edge.faded', style: { opacity: 0.1 } as unknown as cytoscape.Css.Node },
      ],
    });
      cyRef.current = cy;

      const getRect = () => container.getBoundingClientRect();

      cy.on('mouseover', 'node', (evt) => {
        const n = evt.target.data();
        const p = evt.renderedPosition;
        const r = getRect();
        setTooltip({
          visible: true, x: r.left + p.x, y: r.top + p.y,
          html: `<strong>${n.label}</strong><span class="tt-type">${n.type}${n.superseded ? ' · superseded' : ''}</span>${n.desc ?? ''}`,
        });
        evt.target.connectedEdges().addClass('highlighted');
      });
      cy.on('mouseout', 'node', () => { setTooltip({ visible: false, x: 0, y: 0, html: '' }); cy!.edges().removeClass('highlighted'); });
      cy.on('mouseover', 'edge', (evt) => {
        const e = evt.target.data();
        const p = evt.renderedPosition;
        const r = getRect();
        setTooltip({ visible: true, x: r.left + p.x, y: r.top + p.y, html: `<span>${e.source} → ${e.target}</span><br><strong>${e.relation}</strong>` });
      });
      cy.on('mouseout', 'edge', () => setTooltip({ visible: false, x: 0, y: 0, html: '' }));
      cy.on('tap', 'node', (evt) => {
        cy!.elements().removeClass('highlighted faded');
        const nb = evt.target.closedNeighborhood();
        nb.addClass('highlighted');
        cy!.elements().not(nb).addClass('faded');
      });
      cy.on('tap', (evt) => { if (evt.target === cy) cy!.elements().removeClass('highlighted faded'); });

      cy.nodes().forEach((n, i) => {
        n.style('opacity', 0);
        setTimeout(() => n.animate({ style: { opacity: n.data('superseded') ? 0.5 : 1 } }, { duration: 200, easing: 'ease-out' }), i * 70);
      });
    };

    const observer = new ResizeObserver(initCy);
    observer.observe(container);
    initCy();

    return () => {
      observer.disconnect();
      cy?.destroy();
      cyRef.current = null;
    };
  }, [graphData, setTooltip]);

  return (
    <div className="flex flex-col h-full">
      {/* Panel header — pixel-close to Circle's panel-header */}
      <div className="flex items-center justify-between px-3 h-9 border-b shrink-0">
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">Traversal graph</span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={fitGraph}>
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon" className="h-6 w-6">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Graph canvas — ref is on this div; Cytoscape mounts here directly */}
      <div ref={containerRef} className="relative flex-1 bg-background min-h-0">
        {!graphData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs text-center pointer-events-none">
            <svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="opacity-25">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Ask a question to see the traversal graph
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 h-9 border-t shrink-0 flex-wrap">
        {[
          { label: 'Finlex statute', color: 'oklch(62% 0.16 248)' },
          { label: 'Verohallinto',   color: 'oklch(63% 0.14 148)' },
          { label: 'Court ruling',   color: 'oklch(68% 0.15 52)' },
          { label: 'Superseded',     color: 'oklch(30% 0.008 272)' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <div className="w-[7px] h-[7px] rounded-[2px] shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-none bg-popover border rounded-md px-2.5 py-1.5 text-xs text-popover-foreground max-w-[190px] shadow-md leading-snug opacity-0 transition-opacity [&_strong]:font-mono [&_strong]:text-[10px] [&_strong]:block [&_strong]:mb-0.5 [&_.tt-type]:text-[9.5px] [&_.tt-type]:uppercase [&_.tt-type]:tracking-wide [&_.tt-type]:text-muted-foreground [&_.tt-type]:block [&_.tt-type]:mb-1"
      />
    </div>
  );
}
