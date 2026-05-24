'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, BookOpen, Scale } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
} from '@/components/ui/sidebar';

const API_BASE = (process.env.NEXT_PUBLIC_TAXXA_API ?? 'http://localhost:8000/ask').replace(/\/ask\/?$/, '');

type GroupColor = 'blue' | 'green' | 'orange';

interface CorpusLeaf { name: string; detail: string; color: GroupColor }
interface CorpusGroup { id: string; label: string; color: GroupColor; count: number; children: CorpusLeaf[] }

interface StatsPayload {
  available: boolean;
  totalParents?: number;
  statutes?: { count: number; items: { name: string; detail: string }[] };
  vero?:  { count: number };
  court?: { count: number };
}

const COLOR_STYLE: Record<GroupColor, string> = {
  blue:   'oklch(62% 0.16 248)',
  green:  'oklch(63% 0.14 148)',
  orange: 'oklch(68% 0.15 52)',
};

const GROUP_ICON: Record<GroupColor, React.ReactNode> = {
  // size-4 is explicit because the icon sits inside a colored <span>, which
  // breaks the SidebarMenuButton's `[&>svg]:size-4` direct-child selector.
  blue:   <FileText className="shrink-0 size-4" />,
  green:  <BookOpen className="shrink-0 size-4" />,
  orange: <Scale className="shrink-0 size-4" />,
};

function buildGroups(stats: StatsPayload | null): CorpusGroup[] {
  return [
    {
      id: 'statutes',
      label: 'Statutes',
      color: 'blue',
      count: stats?.statutes?.count ?? 0,
      children: (stats?.statutes?.items ?? []).map((it) => ({
        name: it.name,
        detail: it.detail,
        color: 'blue' as const,
      })),
    },
    {
      id: 'verohallinto',
      label: 'Verohallinto',
      color: 'green',
      count: stats?.vero?.count ?? 0,
      children: [],
    },
    {
      id: 'court',
      label: 'Court rulings',
      color: 'orange',
      count: stats?.court?.count ?? 0,
      children: [],
    },
  ];
}

export function NavCorpus() {
  const [stats, setStats] = useState<StatsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/corpus/stats`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setStats(j as StatsPayload); })
      .catch(() => { /* leave stats null; we'll show 0s rather than crash */ });
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo(() => buildGroups(stats), [stats]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Corpus</SidebarGroupLabel>
      <SidebarMenu>
        {groups.map((group) => {
          const hasChildren = group.children.length > 0;
          const header = (
            <>
              <span style={{ color: COLOR_STYLE[group.color] }}>{GROUP_ICON[group.color]}</span>
              <span>{group.label}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {group.count.toLocaleString()}
              </span>
              {hasChildren && (
                <ChevronRight className="ml-1 shrink-0 size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              )}
            </>
          );
          if (!hasChildren) {
            // No breakdown to show — render as a non-interactive row, no chevron.
            return (
              <SidebarMenuItem key={group.id}>
                <SidebarMenuButton tooltip={group.label} className="cursor-default hover:bg-transparent">
                  {header}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }
          return (
            <Collapsible key={group.id} asChild defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={group.label}>{header}</SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {group.children.map((child) => (
                      <SidebarMenuSubItem key={child.name}>
                        <SidebarMenuSubButton>
                          <span
                            className="inline-block w-[5px] h-[5px] rounded-[1.5px] shrink-0"
                            style={{ background: COLOR_STYLE[child.color] }}
                          />
                          <span>{child.name}</span>
                          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{child.detail}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
