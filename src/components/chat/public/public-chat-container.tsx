'use client';

import { memo } from 'react';
import {
	ChatContainerRoot,
	ChatContainerContent,
} from '@/components/ui/chat-container';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { ScrollButton } from '@/components/ui/scroll-button';
import { Magnetic } from '@/components/ui/magnetic';
import { PublicMessageItem } from './public-message-item';
import { cn } from '@/lib/utils';
import { PublicMessage } from '@/lib/types';

interface PublicChatContainerProps {
	messages: PublicMessage[];
}

/**
 * Chat container for displaying public shared messages
 * Replicates the styling of the regular chat container but for read-only public messages
 */
export const PublicChatContainer = memo(function PublicChatContainer({
	messages,
}: PublicChatContainerProps) {
	return (
		<div className="flex h-full flex-col overflow-hidden justify-end relative">
			<div
				className={cn('px-6 max-w-3xl mx-auto pt-24 pb-16 space-y-10 group')}>
				{messages.map((message, index) => {
					return (
						<PublicMessageItem
							key={message._id}
							message={message}
							index={index}
						/>
					);
				})}
			</div>
		</div>
	);
});
