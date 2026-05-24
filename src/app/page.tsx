'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryStore } from '@/store/query-store';

export default function Home() {
  const router = useRouter();
  const newChatId = useQueryStore((s) => s.newChatId);

  useEffect(() => {
    const id = newChatId();
    router.replace(`/c/${id}`);
  }, [router, newChatId]);

  return null;
}
