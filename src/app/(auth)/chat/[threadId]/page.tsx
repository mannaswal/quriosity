import { ChatView } from '@/components/chat/chat-view';
import { Id } from 'convex/_generated/dataModel';
import { ThreadGuard } from '@/components/chat/thread-guard';

export default async function ChatPage({
	params,
}: {
	params: Promise<{ threadId: Id<'threads'> }>;
}) {
	const { threadId } = await params;

	return (
		<ThreadGuard>
			<ChatView threadId={threadId} />
		</ThreadGuard>
	);
}
