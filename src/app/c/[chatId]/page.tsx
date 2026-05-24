'use client';

import { use, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { useQueryStore } from '@/store/query-store';

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  const setCurrentChat = useQueryStore((s) => s.setCurrentChat);

  useEffect(() => {
    void setCurrentChat(chatId);
  }, [chatId, setCurrentChat]);

  return <MainLayout />;
}
