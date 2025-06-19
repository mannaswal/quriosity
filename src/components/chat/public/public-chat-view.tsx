'use client';

import { usePublicThread, usePublicThreadMessages } from '@/hooks/use-threads';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { PublicChatContainer } from './public-chat-container';
import { PublicChatHeader } from './public-chat-header';
import { PublicChatFooter } from './public-chat-footer';
import { MessageCircle, MessageSquare } from 'lucide-react';
import { Loading } from '@/components/layout/loading';

interface PublicChatViewProps {
	shareId: string;
}

/**
 * Public chat view that replicates the look and feel of the regular chat interface
 * but for shared threads without interactive functionality
 */
export function PublicChatView({ shareId }: PublicChatViewProps) {
	const thread = usePublicThread(shareId);
	const messages = usePublicThreadMessages(shareId);

	if (thread === undefined || messages === undefined) {
		return <Loading message="Loading shared chat..." />;
	}

	if (thread === null || messages === null) {
		return (
			<div className="w-full h-screen max-h-screen relative flex items-center justify-center">
				<div className="text-center">
					<MessageSquare
						strokeWidth={0.6}
						className="w-16 h-16 text-muted-foreground mx-auto mb-4"
					/>
					<h1 className="text-3xl font-semibold mb-2">Chat Not Found</h1>
					<p className="text-muted-foreground text-sm">
						This shared chat doesn't exist or is no longer public.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full relative">
			<PublicChatHeader thread={thread} />
			<PublicChatContainer messages={messages} />
			<PublicChatFooter />

			<ProgressiveBlur
				className="pointer-events-none fixed top-0 left-0 h-16 w-full z-[5]"
				blurIntensity={0.4}
				blurLayers={12}
				direction="top"
			/>
			<div className="fixed top-0 left-0 h-18 w-full bg-gradient-to-t from-transparent to-background/95 z-[4]" />
		</div>
	);
}
