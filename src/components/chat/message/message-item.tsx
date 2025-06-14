import { Message as ChatMessage } from '@/lib/types';
import { AssistantMessage } from './assistant-message';
import { UserMessage } from './user-message';

/**
 * Main message item component that conditionally renders user or assistant messages
 * Now supports streaming for assistant messages
 */
export function MessageItem({
	message,
	index,
}: {
	message: ChatMessage;
	index: number;
}) {
	if (message.role === 'assistant')
		return (
			<AssistantMessage
				message={message}
				index={index}
			/>
		);

	if (message.role === 'user')
		return (
			<UserMessage
				message={message}
				index={index}
			/>
		);

	return <div>Unknown message role: {message.role}</div>;
}
