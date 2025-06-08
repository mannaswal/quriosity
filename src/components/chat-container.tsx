'use client';

import { useState, useEffect, useRef } from 'react';
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

interface ChatContainerProps {
	messages: any[];
	optimisticMessage?: {
		role: 'assistant';
		content: string;
	} | null;
}

export default function ChatContainer({
	messages,
	optimisticMessage,
}: ChatContainerProps) {
	// Create the final list of messages to render
	let messagesToRender = [...messages];

	if (optimisticMessage) {
		// Check if there's an in-progress message at the end
		const lastMessage = messagesToRender[messagesToRender.length - 1];
		if (
			lastMessage &&
			lastMessage.role === 'assistant' &&
			lastMessage.status === 'in_progress'
		) {
			// Replace the in-progress message with the optimistic one
			messagesToRender[messagesToRender.length - 1] = {
				...lastMessage,
				content: optimisticMessage.content,
			};
		} else {
			// Append the optimistic message
			messagesToRender.push({
				role: 'assistant',
				content: optimisticMessage.content,
			});
		}
	}

	return (
		<div className="flex h-screen pb-28 w-full flex-col overflow-hidden">
			<ChatContainerRoot className="flex-1">
				<ChatContainerContent className="space-y-4 p-4 max-w-3xl mx-auto">
					{messagesToRender.map((message) => (
						<Message
							key={message._id}
							className={cn(
								'py-1.5 px-3 rounded-lg leading-loose',
								message.role === 'user' && 'bg-neutral-800 self-end',
								message.role === 'assistant' && 'text-foreground/80 self-start'
							)}>
							<Markdown
								id={message._id}
								className="prose dark:prose-invert">
								{message.content}
							</Markdown>
						</Message>
					))}
				</ChatContainerContent>
			</ChatContainerRoot>
		</div>
	);
}
