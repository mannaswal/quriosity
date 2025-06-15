'use client';

import { memo, useRef, useEffect } from 'react';
import {
	ChatContainerRoot,
	ChatContainerContent,
} from '@/components/ui/chat-container';
import { useThreadMessages } from '@/hooks/use-messages';
import { ProgressiveBlur } from '../ui/progressive-blur';
import { ScrollButton } from '../ui/scroll-button';
import { Magnetic } from '../ui/magnetic';
import { MessageItem } from './message/message-item';
import { useThreadId } from '@/hooks/use-threads';
import { cn } from '@/lib/utils';

const ChatContainer = memo(function ChatContainer() {
	const threadId = useThreadId();
	const messages = useThreadMessages(threadId);

	useEffect(() => {}, [messages]);

	return (
		<div className="flex h-screen flex-col overflow-hidden justify-end relative">
			<ChatContainerRoot className="flex-1 px-0.5 pl-2">
				<ChatContainerContent
					className={cn(
						'px-4 max-w-3xl mx-auto pt-14 pb-32 space-y-4 group scroll-m-2'
					)}>
					{messages.map((message, index) => {
						return (
							<MessageItem
								key={message._id}
								message={message}
								index={index}
							/>
						);
					})}
				</ChatContainerContent>
				<div className="absolute right-1/2 bottom-32 translate-x-1/2">
					<Magnetic>
						<ScrollButton className="shadow-sm h-6 w-12 backdrop-blur-sm hover:translate-y-0.5 transition-transform duration-150" />
					</Magnetic>
				</div>
				<div className="h-2 bg-background absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl" />
			</ChatContainerRoot>
		</div>
	);
});

export default ChatContainer;
