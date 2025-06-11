import { Id } from '../../../../convex/_generated/dataModel';
import { ChatView } from '@/components/chat/chat-view';

export default async function ChatPage({
	params,
}: {
	params: Promise<{ threadId: Id<'threads'> }>;
}) {
	const { threadId } = await params;
	return <ChatView threadId={threadId} />;
}
