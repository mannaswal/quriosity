'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import {
	Message,
	MessageAvatar,
	MessageContent,
} from '@/components/ui/message';
import {
	ChatContainerRoot,
	ChatContainerContent,
} from '@/components/ui/chat-container';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/lib/types';
import { useMessages } from '@/hooks/use-messages';
import { Id } from '../../convex/_generated/dataModel';

interface ChatContainerProps {
	threadId?: Id<'threads'>;
}

// Memoized message item component to prevent unnecessary re-renders
const MessageItem = memo(function MessageItem({
	message,
}: {
	message: ChatMessage;
}) {
	return (
		<Message
			key={message._id}
			className={cn(
				'py-1.5 px-3 rounded-lg leading-loose',
				message.role === 'user' && 'bg-neutral-800 self-end max-w-xl',
				message.role === 'assistant' && 'text-neutral-100'
			)}>
			<Markdown
				id={message._id}
				className="max-w-full prose dark:prose-invert">
				{message.content}
			</Markdown>
		</Message>
	);
});

const ChatContainer = memo(function ChatContainer({
	threadId,
}: ChatContainerProps) {
	const messages = useMessages(threadId) ?? [];

	return (
		<div className="flex h-screen w-full flex-col overflow-hidden justify-end pb-2">
			<ChatContainerRoot className="flex-1 justify-end">
				<ChatContainerContent className="space-y-4 p-2 max-w-3xl mx-auto pt-10 pb-32">
					{messages.map((message) => (
						<MessageItem
							key={message._id}
							message={message as ChatMessage} // Cast needed because of Convex types
						/>
					))}
				</ChatContainerContent>
			</ChatContainerRoot>
		</div>
	);
});

export default ChatContainer;
