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
import { useThread, useThreadId } from '@/hooks/use-threads';
import { cn } from '@/lib/utils';
import { ChatInput } from './input/chat-input';
import { Preloaded } from 'convex/react';
import { api } from 'convex/_generated/api';
import { usePreloadedQuery } from 'convex/react';
import { Message, Thread, ThreadId, User } from '@/lib/types';
import { useCurrentUser } from '@/hooks/use-user';

const ChatContainer = memo(function ChatContainer({
	threadId,
}: {
	threadId: ThreadId | undefined;
}) {
	const clientMessages = useThreadMessages();
	const clientThread = useThread();
	const clientUser = useCurrentUser();

	const messages = clientMessages; // ?? serverMessages;
	const thread = clientThread; // ?? serverThread;
	const user = clientUser; // ?? serverUser;

	return (
		<div className="flex h-screen flex-col overflow-hidden justify-end relative">
			<ChatContainerRoot className="flex-1">
				<ChatContainerContent
					className={cn('px-6 max-w-3xl mx-auto pt-14 pb-40 space-y-4 group')}>
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

				<ChatInput
					thread={thread ?? undefined}
					user={user ?? undefined}
				/>
				<div className="h-2 bg-background absolute bottom-0 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[calc(48rem-32px)] z-50" />
			</ChatContainerRoot>
		</div>
	);
});

export default ChatContainer;
