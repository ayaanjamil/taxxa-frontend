import { AppSidebar } from '@/components/layout/sidebar/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { WorkspacePanel } from '@/components/panels/workspace-panel';

export function MainLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="h-svh overflow-hidden lg:p-2 w-full">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col bg-container h-full w-full">
          <WorkspacePanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
