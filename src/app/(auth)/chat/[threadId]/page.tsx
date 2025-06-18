import { ChatView } from '@/components/chat/chat-view';
import { ThreadGuard } from '@/components/chat/thread-guard';

export default function ChatPage() {
	return (
		<ThreadGuard>
			<ChatView />
		</ThreadGuard>
	);
}
