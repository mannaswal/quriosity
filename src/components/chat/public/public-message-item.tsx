import { PublicMessage } from '@/lib/types';
import { PublicAssistantMessage } from './public-assistant-message';
import { PublicUserMessage } from './public-user-message';

/**
 * Message item component for public shared messages
 * Routes between public user and assistant message components
 */
export function PublicMessageItem({
	message,
	index,
}: {
	message: PublicMessage;
	index: number;
}) {
	if (message.role === 'assistant')
		return (
			<PublicAssistantMessage
				message={message}
				index={index}
			/>
		);

	if (message.role === 'user')
		return (
			<PublicUserMessage
				message={message}
				index={index}
			/>
		);

	return <div>Unknown message role: {message.role}</div>;
}
