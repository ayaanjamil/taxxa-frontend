'use client';

import { Search } from 'lucide-react';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useQueryStore } from '@/store/query-store';

const RELATIVE_TIMES = ['now', '2m', '8m', '15m', '32m'];

export function NavRecent() {
  const { recentQueries, messages, loadRecent } = useQueryStore();
  const currentQuestion = messages.findLast(m => m.role === 'user')?.question ?? '';

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Recent</SidebarGroupLabel>
      <SidebarMenu>
        {recentQueries.map((q, i) => (
          <SidebarMenuItem key={q}>
            <SidebarMenuButton
              isActive={q === currentQuestion}
              onClick={() => loadRecent(q)}
              className="h-auto py-1.5"
            >
              <Search className="shrink-0" />
              <span className="truncate flex-1 text-xs">{q}</span>
              <span className="text-muted-foreground text-[10px] font-mono shrink-0">{RELATIVE_TIMES[i] ?? '—'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
