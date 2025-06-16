'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/chat/chat-container';
import { ChatInput } from '@/components/chat/input/chat-input';
import { useThread, useThreadId } from '@/hooks/use-threads';
import { toast } from 'sonner';
import { ProgressiveBlur } from '../ui/progressive-blur';

export function ChatView() {
	const router = useRouter();
	const thread = useThread();
	const threadId = useThreadId();

	const [isThreadDeleted, setIsThreadDeleted] = useState(false);

	// Handle thread deletion detection
	useEffect(() => {
		if (thread === null && !isThreadDeleted) {
			// Thread was deleted (query returned null, not undefined which means loading)
			setIsThreadDeleted(true);
			toast.error('This conversation has been deleted');
			router.push('/');
		}
	}, [thread, isThreadDeleted, router]);

	// Prevent rendering chat interface for a deleted thread
	if (isThreadDeleted) {
		return null; // or a "thread deleted" message
	}

	return (
		<div className="w-full h-screen max-h-screen relative">
			<ProgressiveBlur
				className="pointer-events-none absolute top-0 left-0 h-14 w-full z-10"
				blurIntensity={0.4}
				blurLayers={12}
				direction="top"
			/>
			<div className="absolute top-0 left-0 h-16 w-full bg-gradient-to-t from-transparent to-background/95" />
			<ChatContainer />
		</div>
	);
}
