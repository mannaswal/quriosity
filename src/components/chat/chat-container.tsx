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
import {
	useMessages,
	useRegenerate,
	useEditAndResubmit,
} from '@/hooks/use-messages';
import { Id } from '../../../convex/_generated/dataModel';
import { models } from '@/lib/models';
import {
	CheckIcon,
	CopyIcon,
	EditIcon,
	RefreshCcwIcon,
	PencilIcon,
	SplitIcon,
} from 'lucide-react';
import { ProgressiveBlur } from '../ui/progressive-blur';
import { Textarea } from '../ui/textarea';
import { ScrollButton } from '../ui/scroll-button';
import { Magnetic } from '../ui/magnetic';
import { useBranchThread } from '@/hooks/use-threads';
import { MessageItem } from './message/message-item';

interface ChatContainerProps {
	threadId?: Id<'threads'>;
}

const ChatContainer = memo(function ChatContainer({
	threadId,
}: ChatContainerProps) {
	const messages = useMessages(threadId) ?? [];

	return (
		<div className="flex h-screen w-full flex-col overflow-hidden justify-end pb-2 relative">
			<ProgressiveBlur
				className="pointer-events-none absolute top-0 left-0 h-14 w-full"
				blurIntensity={0.4}
				blurLayers={12}
				direction="top"
			/>
			<div className="absolute top-0 left-0 h-14 w-full bg-gradient-to-t from-transparent to-background/95" />
			<ChatContainerRoot className="flex-1">
				<ChatContainerContent className="p-4 max-w-3xl mx-auto pt-14 pb-32 space-y-1">
					{messages.map((message, index) => {
						const showRetry =
							message.role === 'user' &&
							messages[index + 1]?.role === 'assistant';
						return (
							<MessageItem
								key={message._id}
								message={message as ChatMessage}
								showRetry={showRetry}
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
