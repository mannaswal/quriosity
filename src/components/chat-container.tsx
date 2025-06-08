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

export default function ChatContainer({ messages }: { messages: any[] }) {
	return (
		<div className="flex h-screen pb-28 w-full flex-col overflow-hidden">
			<ChatContainerRoot className="flex-1">
				<ChatContainerContent className="space-y-4 p-4">
					{messages.map((message, index) => (
						<Message
							key={index}
							className={cn(
								'py-2 px-3 rounded-lg max-w-lg leading-loose',
								message.role === 'user' && 'bg-neutral-800 self-end',
								message.role === 'assistant' && 'text-foreground/80 self-start'
							)}>
							<Markdown>{message.content}</Markdown>
						</Message>
					))}
				</ChatContainerContent>
			</ChatContainerRoot>
		</div>
	);
}
