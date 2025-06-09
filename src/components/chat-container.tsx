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
import { ChatMessage, OptimisticMessage } from '@/lib/types';

interface ChatContainerProps {
	messages: ChatMessage[];
	optimisticMessage?: OptimisticMessage | null;
}

// Memoized message item component to prevent unnecessary re-renders
const MessageItem = memo(function MessageItem({
	message,
	index,
}: {
	message: ChatMessage | (OptimisticMessage & { _id?: string });
	index: number;
}) {
	return (
		<Message
			key={message._id || `message-${index}`}
			className={cn(
				'py-1.5 px-3 rounded-lg leading-loose',
				message.role === 'user' && 'bg-neutral-800 self-end max-w-xl',
				message.role === 'assistant' && 'text-neutral-100'
			)}>
			<Markdown
				id={message._id || `markdown-${index}`}
				className="max-w-full prose dark:prose-invert">
				{message.content}
			</Markdown>
		</Message>
	);
});

const ChatContainer = memo(function ChatContainer({
	messages,
	optimisticMessage,
}: ChatContainerProps) {
	// Create the final list of messages to render
	type RenderableMessage = ChatMessage | (OptimisticMessage & { _id?: string });
	let messagesToRender: RenderableMessage[] = [...messages];

	if (optimisticMessage) {
		// Check if there's an in-progress message at the end
		const lastMessage = messagesToRender[messagesToRender.length - 1];
		if (
			lastMessage &&
			lastMessage.role === 'assistant' &&
			'status' in lastMessage &&
			lastMessage.status === 'in_progress'
		) {
			// Replace the in-progress message with the optimistic one
			messagesToRender[messagesToRender.length - 1] = {
				...lastMessage,
				content: optimisticMessage.content,
			};
		} else {
			// Append the optimistic message with a temporary ID
			messagesToRender.push({
				...optimisticMessage,
				_id: `optimistic-${Date.now()}`,
			});
		}
	}

	return (
		<div className="flex h-screen w-full flex-col overflow-hidden justify-end pb-2">
			<ChatContainerRoot className="flex-1 justify-end">
				<ChatContainerContent className="space-y-4 p-2 max-w-3xl mx-auto pt-10 pb-32">
					{messagesToRender.map((message, index) => (
						<MessageItem
							key={message._id || `message-${index}`}
							message={message}
							index={index}
						/>
					))}
				</ChatContainerContent>
			</ChatContainerRoot>
		</div>
	);
});

export default ChatContainer;
