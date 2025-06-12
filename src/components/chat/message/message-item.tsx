import { memo } from 'react';
import { ChatMessage } from '@/lib/types';
import { AssistantMessage } from './assistant-message';
import { UserMessage } from './user-message';
import { Id } from '../../../../convex/_generated/dataModel';

/**
 * Main message item component that conditionally renders user or assistant messages
 * Now supports streaming for assistant messages
 */
export const MessageItem = memo(function MessageItem({
	message,
	showRetry,
}: {
	message: ChatMessage;
	showRetry: boolean;
}) {
	if (message.role === 'assistant')
		return <AssistantMessage message={message} />;

	if (message.role === 'user')
		return (
			<UserMessage
				message={message}
				showRetry={showRetry}
			/>
		);

	return <div>Unknown message role: {message.role}</div>;
});
