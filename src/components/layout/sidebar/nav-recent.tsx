'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MessageSquareText, Plus, Trash2 } from 'lucide-react';
import { useQueryStore } from '@/store/query-store';
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

function relativeTime(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NavRecent() {
  const router = useRouter();
  const params = useParams<{ chatId?: string }>();
  const chatList = useQueryStore((s) => s.chatList);
  const deleteChat = useQueryStore((s) => s.deleteChat);
  const newChatId = useQueryStore((s) => s.newChatId);
  const activeId = params?.chatId;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarGroupAction
        title="New chat"
        onClick={() => router.push(`/c/${newChatId()}`)}
      >
        <Plus className="h-3 w-3" />
      </SidebarGroupAction>
      <SidebarMenu>
        {chatList.length === 0 && (
          <li className="px-2 py-1 text-[11px] text-muted-foreground">No chats yet</li>
        )}
        {chatList.map((c) => (
          <SidebarMenuItem key={c.id} className="group/chat">
            <SidebarMenuButton
              isActive={c.id === activeId}
              asChild
              className="h-auto py-1.5"
            >
              <Link href={`/c/${c.id}`}>
                <MessageSquareText className="shrink-0" />
                <span className="truncate flex-1 text-xs">{c.title}</span>
                <span className="text-muted-foreground text-[10px] font-mono shrink-0 group-hover/chat:opacity-0 transition-opacity">
                  {relativeTime(c.updatedAt)}
                </span>
              </Link>
            </SidebarMenuButton>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Delete this chat?')) {
                  void deleteChat(c.id);
                  if (c.id === activeId) router.push('/');
                }
              }}
              title="Delete chat"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/chat:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
