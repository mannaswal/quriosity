'use client';

import ChatContainer from '@/components/chat/chat-container';
import { ProgressiveBlur } from '../ui/progressive-blur';
import { useThreadId } from '@/hooks/use-threads';

export function ChatView() {
	const threadId = useThreadId();

	return (
		<div className="w-full h-screen max-h-screen relative">
			<ProgressiveBlur
				className="pointer-events-none absolute top-0 left-0 h-14 w-full z-[5]"
				blurIntensity={0.4}
				blurLayers={12}
				direction="top"
			/>
			<div className="absolute top-0 left-0 h-16 w-full bg-gradient-to-t from-transparent to-background/95 z-[4]" />
			<ChatContainer threadId={threadId} />
		</div>
	);
}
