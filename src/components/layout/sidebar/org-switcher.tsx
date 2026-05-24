'use client';

import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { GetlakiLogo } from '@/components/ui/getlaki-logo';

export function OrgSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="w-full flex items-center justify-between px-1 pt-2 pb-1">
          <GetlakiLogo width={72} className="text-foreground" />
          <ThemeToggle />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
