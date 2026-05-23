'use client';

import * as React from 'react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarSeparator } from '@/components/ui/sidebar';
import { OrgSwitcher } from './org-switcher';
import { NavRecent } from './nav-recent';
import { NavCorpus } from './nav-corpus';
import { NavEval } from './nav-eval';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavRecent />
        <SidebarSeparator />
        <NavCorpus />
        <SidebarSeparator />
        <NavEval />
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0" />
          <div>
            <p className="text-[11px] text-muted-foreground leading-none">FastAPI</p>
            <p className="text-[10px] text-muted-foreground font-mono leading-none mt-0.5">localhost:8000</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
