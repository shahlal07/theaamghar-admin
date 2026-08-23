import { getAdminUser } from '@/lib/dal';
import { getMySupportConversation, getConversationMessages } from '@/lib/queries/support';
import { SupportClient } from './SupportClient';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const admin = await getAdminUser();
  const conversation = await getMySupportConversation(admin.id);
  const messages = conversation ? await getConversationMessages(conversation.id) : [];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Support</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Message the Nashemann platform team directly — questions, requests, or anything you need help
        with as a vendor.
      </p>
      <SupportClient adminName={admin.name ?? admin.email} conversation={conversation} initialMessages={messages} />
    </div>
  );
}
