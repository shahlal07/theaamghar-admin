'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Self-contained so Sidebar doesn't need to thread support-unread state down
// from the server layout -- fetches its own conversation row and listens for
// the superadmin flipping customer_unread back to true.
export function SupportNavBadge() {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let conversationId: string | null = null;
    let cancelled = false;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('support_conversations')
        .select('id, customer_unread')
        .eq('customer_id', user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      conversationId = data.id;
      setUnread(data.customer_unread);
    });

    const channel = supabase
      .channel('support_nav_badge')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_conversations' },
        (payload) => {
          const row = payload.new as { id: string; customer_unread: boolean };
          if (conversationId && row.id === conversationId) setUnread(row.customer_unread);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (!unread) return null;
  return <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-[var(--mango-orange)]" aria-label="Unread reply" />;
}
