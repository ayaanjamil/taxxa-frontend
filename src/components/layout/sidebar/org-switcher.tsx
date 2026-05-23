'use client';

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export function OrgSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="w-full flex gap-1 items-center pt-2">
          <SidebarMenuButton size="lg" className="h-8 p-1">
            <div className="flex aspect-square size-6 items-center justify-center rounded bg-violet-600 text-white font-mono text-[10px] font-medium shrink-0">
              tx
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Taxxa</span>
            </div>
          </SidebarMenuButton>
          <ThemeToggle />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
