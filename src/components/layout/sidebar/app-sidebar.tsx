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
        <a
          href="https://ayaanjamil.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors group"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground/85 text-background text-[10px] font-semibold shrink-0">
            AJ
          </span>
          <div className="leading-tight min-w-0">
            <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Made by</p>
            <p className="text-[12px] font-medium text-foreground/90 group-hover:text-foreground truncate">
              Ayaan Jamil
            </p>
          </div>
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
