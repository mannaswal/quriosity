'use client';

import { memo, useRef, useEffect, useState } from 'react';
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
	const [tallerThanScreen, setTallerThanScreen] = useState(false);
	const threadId = useThreadId();
	const messages = useThreadMessages(threadId);

	useEffect(() => {}, [messages]);

	return (
		<div className="flex h-screen flex-col overflow-hidden justify-end pb-3 relative">
			<ProgressiveBlur
				className="pointer-events-none absolute top-0 left-0 h-14 w-full z-10"
				blurIntensity={0.4}
				blurLayers={12}
				direction="top"
			/>
			<div className="absolute top-0 left-0 h-16 w-full bg-gradient-to-t from-transparent to-background/95" />
			<ChatContainerRoot className="flex-1">
				<ChatContainerContent
					data-tall={tallerThanScreen}
					className={cn(
						'p-4 sm:px-6 max-w-3xl mx-auto pt-14 pb-32 space-y-4 group'
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
			</ChatContainerRoot>
		</div>
	);
});

export default ChatContainer;
