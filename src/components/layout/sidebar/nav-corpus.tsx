'use client';

import { ChevronRight, FileText, BookOpen, Scale } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { CORPUS_GROUPS } from '@/mock-data/corpus';

const COLOR_STYLE: Record<string, string> = {
  blue:   'oklch(62% 0.16 248)',
  green:  'oklch(63% 0.14 148)',
  orange: 'oklch(68% 0.15 52)',
};

const GROUP_ICON: Record<string, React.ReactNode> = {
  blue:   <FileText className="shrink-0" />,
  green:  <BookOpen className="shrink-0" />,
  orange: <Scale className="shrink-0" />,
};

export function NavCorpus() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Corpus</SidebarGroupLabel>
      <SidebarMenu>
        {CORPUS_GROUPS.map((group, index) => (
          <Collapsible key={group.id} asChild defaultOpen={index === 0} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={group.label}>
                  <span style={{ color: COLOR_STYLE[group.color] }}>{GROUP_ICON[group.color]}</span>
                  <span>{group.label}</span>
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">{group.count}</span>
                  <ChevronRight className="ml-1 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
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
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
