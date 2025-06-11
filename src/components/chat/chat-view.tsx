'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/chat/chat-container';
import { ChatInput } from '@/components/chat/chat-input';
import { useThread } from '@/hooks/use-threads';
import { Id } from '../../../convex/_generated/dataModel';
import { toast } from 'sonner';

interface ChatViewProps {
	threadId?: Id<'threads'>;
}

export function ChatView({ threadId }: ChatViewProps) {
	const router = useRouter();
	const thread = useThread(threadId);
	const [isThreadDeleted, setIsThreadDeleted] = useState(false);

	// Handle thread deletion detection
	useEffect(() => {
		if (threadId && thread === null && !isThreadDeleted) {
			// Thread was deleted (query returned null, not undefined which means loading)
			setIsThreadDeleted(true);
			toast.error('This conversation has been deleted');
			router.push('/');
		}
	}, [thread, threadId, isThreadDeleted, router]);

	// Prevent rendering chat interface for a deleted thread
	if (isThreadDeleted) {
		return null; // or a "thread deleted" message
	}

	return (
		<div className="w-full h-screen max-h-screen relative">
			<ChatContainer threadId={threadId} />
			<ChatInput threadId={threadId} />
		</div>
	);
}
