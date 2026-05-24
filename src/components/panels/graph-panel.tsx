'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Maximize2, Download } from 'lucide-react';
import cytoscape, { type Core } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { Button } from '@/components/ui/button';
import {
  type GraphData,
  type GraphNode,
  type GraphEdge,
  NODE_COLORS,
  SUPERSEDED_COLORS,
  EDGE_COLORS,
} from '@/mock-data/graph';

if (typeof window !== 'undefined') {
  cytoscape.use(dagre);
}

interface GraphPanelProps {
  graphData: GraphData | null;
  queryId: string | null;
  tab: 'traversal' | 'amendments';
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  html: string;
}

const TRUNCATE_LABEL = (label: string, max = 28) =>
  label.length > max ? label.slice(0, max - 1) + '…' : label;

function nodeStyleData(n: GraphNode) {
  const c = n.superseded ? SUPERSEDED_COLORS : (NODE_COLORS[n.type] ?? NODE_COLORS.ARTICLE);
  return {
    id: n.id,
    label: TRUNCATE_LABEL(n.label),
    fullLabel: n.label,
    type: n.type,
    superseded: n.superseded,
    desc: n.desc,
    bg: c.bg,
    border: c.border,
    textColor: c.text,
  };
}

function edgeId(e: GraphEdge) {
  return `${e.source}->${e.target}:${e.relation}`;
}

function edgeStyleData(e: GraphEdge) {
  return {
    id: edgeId(e),
    source: e.source,
    target: e.target,
    relation: e.relation,
    lineColor: EDGE_COLORS[e.relation] ?? EDGE_COLORS.references,
  };
}

function filterGraph(g: GraphData, tab: 'traversal' | 'amendments'): GraphData {
  if (tab === 'traversal') return g;
  // Amendments: keep only amends/repeals edges and their endpoint nodes.
  const keepEdges = g.edges.filter((e) => e.relation === 'amends' || e.relation === 'repeals');
  const keepIds = new Set<string>();
  keepEdges.forEach((e) => { keepIds.add(e.source); keepIds.add(e.target); });
  const keepNodes = g.nodes.filter((n) => keepIds.has(n.id) || n.superseded);
  // Include superseded nodes always so amendment context is visible.
  keepNodes.forEach((n) => keepIds.add(n.id));
  return { nodes: keepNodes, edges: keepEdges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target)) };
}

export function GraphPanel({ graphData, queryId, tab }: GraphPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const seenNodesRef = useRef<Set<string>>(new Set());
  const seenEdgesRef = useRef<Set<string>>(new Set());
  const lastQueryIdRef = useRef<string | null>(null);
  const lastTabRef = useRef<'traversal' | 'amendments'>('traversal');

  const filtered = useMemo(
    () => (graphData ? filterGraph(graphData, tab) : null),
    [graphData, tab],
  );

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

  const downloadPng = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    // Render at 2× for a crisper image; `full: true` exports the whole graph
    // (not just the visible viewport), bg matches the panel background.
    const isDark = document.documentElement.classList.contains('dark');
    const blob = cy.png({
      output: 'blob',
      full: true,
      scale: 2,
      bg: isDark ? '#101011' : '#ffffff',
    }) as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taxxa-graph-${tab}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [tab]);

  const runLayout = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const edgeCount = cy.edges().length;
    // Dagre with zero edges collapses every node to rank 0 (a single row).
    // Treaty queries often have entry-only nodes (treaty parents are leaves
    // in the cites/amends graph) — use a grid layout so they at least lay
    // out cleanly in two dimensions instead of a single horizontal strip.
    if (edgeCount === 0) {
      cy.layout({
        name: 'grid',
        avoidOverlap: true,
        avoidOverlapPadding: 14,
        fit: true,
        padding: 36,
        animate: true,
        animationDuration: 320,
      } as Parameters<Core['layout']>[0]).run();
      return;
    }
    cy.layout({
      name: 'dagre',
      rankDir: 'TB',
      nodeSep: 28,
      rankSep: 70,
      edgeSep: 12,
      animate: true,
      animationDuration: 380,
      fit: true,
      padding: 32,
    } as Parameters<Core['layout']>[0]).run();
  }, []);

  // Init Cytoscape once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialized = false;
    const init = () => {
      if (initialized || !container.offsetWidth || !container.offsetHeight) return;
      initialized = true;

      const cy = cytoscape({
        container,
        elements: [],
        layout: { name: 'preset' } as Parameters<Core['layout']>[0],
        wheelSensitivity: 0.22,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(bg)',
              'border-color': 'data(border)',
              'border-width': 1.5,
              color: 'data(textColor)',
              label: 'data(label)',
              'font-family': 'ui-monospace, monospace',
              'font-size': '10.5px',
              'font-weight': '500',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'none',
              width: 'label',
              height: 26,
              padding: '0 11px',
              shape: 'round-rectangle',
              'transition-property': 'opacity, border-width, border-color',
              'transition-duration': '0.18s',
            } as unknown as cytoscape.Css.Node,
          },
          { selector: 'node[?superseded]', style: { opacity: 0.5, 'border-style': 'dashed' } as unknown as cytoscape.Css.Node },
          { selector: 'node.highlighted', style: { 'border-width': 2.5, 'border-color': 'oklch(64% 0.18 282)', 'z-index': 10 } as unknown as cytoscape.Css.Node },
          { selector: 'node.newly-added', style: { 'border-width': 2.5, 'border-color': 'oklch(64% 0.18 282)' } as unknown as cytoscape.Css.Node },
          {
            selector: 'edge',
            style: {
              'line-color': 'data(lineColor)',
              'target-arrow-color': 'data(lineColor)',
              'target-arrow-shape': 'triangle',
              'arrow-scale': 0.7,
              width: 1.4,
              'curve-style': 'bezier',
              opacity: 0.7,
              label: 'data(relation)',
              'font-family': 'ui-sans-serif, sans-serif',
              'font-size': '9px',
              color: 'oklch(40% 0.012 272)',
              'text-opacity': 0,
              'text-background-color': 'oklch(100% 0 0)',
              'text-background-opacity': 0,
              'text-background-padding': '2px',
              'transition-property': 'opacity, text-opacity, width',
              'transition-duration': '0.18s',
            } as unknown as cytoscape.Css.Edge,
          },
          { selector: 'edge.highlighted', style: { opacity: 1, width: 2.5, 'text-opacity': 1, 'text-background-opacity': 0.95, 'z-index': 10 } as unknown as cytoscape.Css.Edge },
          { selector: 'edge.newly-added', style: { 'line-color': 'oklch(64% 0.18 282)', 'target-arrow-color': 'oklch(64% 0.18 282)', width: 2.5 } as unknown as cytoscape.Css.Edge },
          { selector: 'node.faded, edge.faded', style: { opacity: 0.12 } as unknown as cytoscape.Css.Node },
        ],
      });
      cyRef.current = cy;

      const getRect = () => container.getBoundingClientRect();

      cy.on('mouseover', 'node', (evt) => {
        const n = evt.target.data();
        const p = evt.renderedPosition;
        const r = getRect();
        setTooltip({
          visible: true,
          x: r.left + p.x,
          y: r.top + p.y,
          html: `<strong>${n.fullLabel ?? n.label}</strong><span class="tt-type">${n.type}${n.superseded ? ' · superseded' : ''}</span>${n.desc ?? ''}`,
        });
        evt.target.connectedEdges().addClass('highlighted');
      });
      cy.on('mouseout', 'node', () => {
        setTooltip({ visible: false, x: 0, y: 0, html: '' });
        cy.edges().removeClass('highlighted');
      });
      cy.on('mouseover', 'edge', (evt) => {
        const e = evt.target.data();
        const p = evt.renderedPosition;
        const r = getRect();
        setTooltip({
          visible: true,
          x: r.left + p.x,
          y: r.top + p.y,
          html: `<span class="tt-mono">${e.source} → ${e.target}</span><br><strong>${e.relation}</strong>`,
        });
      });
      cy.on('mouseout', 'edge', () => setTooltip({ visible: false, x: 0, y: 0, html: '' }));
      cy.on('tap', 'node', (evt) => {
        cy.elements().removeClass('highlighted faded');
        const nb = evt.target.closedNeighborhood();
        nb.addClass('highlighted');
        cy.elements().not(nb).addClass('faded');
      });
      cy.on('tap', (evt) => { if (evt.target === cy) cy.elements().removeClass('highlighted faded'); });
    };

    const observer = new ResizeObserver(init);
    observer.observe(container);
    init();

    return () => {
      observer.disconnect();
      cyRef.current?.destroy();
      cyRef.current = null;
      seenNodesRef.current.clear();
      seenEdgesRef.current.clear();
    };
  }, [setTooltip]);

  // Sync graphData → Cytoscape incrementally.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !filtered) return;

    // Reset when the queryId changes — explicit, no heuristics.
    const queryChanged = queryId !== lastQueryIdRef.current;
    const tabChanged = tab !== lastTabRef.current;
    if (queryChanged || tabChanged) {
      cy.elements().remove();
      seenNodesRef.current.clear();
      seenEdgesRef.current.clear();
      lastQueryIdRef.current = queryId;
      lastTabRef.current = tab;
    }

    const newNodes = filtered.nodes.filter((n) => !seenNodesRef.current.has(n.id));
    const newEdges = filtered.edges.filter((e) => {
      const id = edgeId(e);
      if (seenEdgesRef.current.has(id)) return false;
      const hasSrc = seenNodesRef.current.has(e.source) || newNodes.some((n) => n.id === e.source);
      const hasTgt = seenNodesRef.current.has(e.target) || newNodes.some((n) => n.id === e.target);
      return hasSrc && hasTgt;
    });

    if (newNodes.length === 0 && newEdges.length === 0) return;

    const added = cy.add([
      ...newNodes.map((n) => ({ group: 'nodes' as const, data: nodeStyleData(n) })),
      ...newEdges.map((e) => ({ group: 'edges' as const, data: edgeStyleData(e) })),
    ]);

    newNodes.forEach((n) => seenNodesRef.current.add(n.id));
    newEdges.forEach((e) => seenEdgesRef.current.add(edgeId(e)));

    added.addClass('newly-added');
    setTimeout(() => added.removeClass('newly-added'), 700);

    runLayout();
  }, [filtered, queryId, tab, runLayout]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 h-9 border-b shrink-0">
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          {tab === 'amendments' ? 'Amendment graph' : 'Traversal graph'}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={fitGraph} title="Fit to view">
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={downloadPng} title="Download as PNG">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Wrapper holds the Cytoscape container plus React-managed overlays
          as SIBLINGS — never as children of the Cytoscape container, because
          Cytoscape mutates its container's DOM directly and React's reconciler
          will throw NotFoundError on removeChild when state changes. */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0 bg-background" />
        {(!filtered || filtered.nodes.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs text-center pointer-events-none">
            <svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="opacity-25">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {tab === 'amendments'
              ? 'No amendment edges in this query'
              : 'Ask a question to see the traversal graph'}
          </div>
        )}
        {filtered && filtered.nodes.length > 0 && filtered.edges.length === 0 && tab === 'traversal' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md border bg-popover/95 backdrop-blur text-[11px] text-muted-foreground shadow-sm pointer-events-none">
            Entry parents only — no <span className="font-mono text-foreground/80">cites</span> /{' '}
            <span className="font-mono text-foreground/80">amends</span> edges from these documents
          </div>
        )}
      </div>

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

      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-none bg-popover border rounded-md px-2.5 py-1.5 text-xs text-popover-foreground max-w-[220px] shadow-md leading-snug opacity-0 transition-opacity [&_strong]:font-mono [&_strong]:text-[10px] [&_strong]:block [&_strong]:mb-0.5 [&_.tt-type]:text-[9.5px] [&_.tt-type]:uppercase [&_.tt-type]:tracking-wide [&_.tt-type]:text-muted-foreground [&_.tt-type]:block [&_.tt-type]:mb-1 [&_.tt-mono]:font-mono [&_.tt-mono]:text-[10px] [&_.tt-mono]:text-muted-foreground"
      />
    </div>
  );
}
