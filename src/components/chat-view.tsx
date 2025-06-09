'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/chat-container';
import { ChatInput } from '@/components/chat-input';
import { useAuth } from '@clerk/nextjs';
import { OptimisticMessage } from '@/lib/types';
import { toast } from 'sonner';
import { ModelId } from '@/lib/models';

interface ChatViewProps {
	threadId?: Id<'threads'>;
}

export function ChatView({ threadId }: ChatViewProps) {
	const router = useRouter();
	const { getToken } = useAuth();
	const [model, setModel] = useState<ModelId>('google/gemini-2.0-flash-001');
	const [optimisticMessage, setOptimisticMessage] =
		useState<OptimisticMessage | null>(null);
	const [isThreadDeleted, setIsThreadDeleted] = useState(false);

	const messages =
		useQuery(api.messages.listByThread, threadId ? { threadId } : 'skip') ?? [];

	// Get thread data to load the current model
	const thread = useQuery(
		api.threads.getThread,
		threadId ? { threadId } : 'skip'
	);

	const prepareForStream = useMutation(api.messages.prepareForStream);
	const createThreadAndPrepareForStream = useMutation(
		api.threads.createThreadAndPrepareForStream
	);
	const updateThreadModel = useMutation(api.threads.updateThreadModel);

	// Handle thread deletion detection
	useEffect(() => {
		if (threadId && thread === null && !isThreadDeleted) {
			// Thread was deleted (query returned null, not undefined which means loading)
			setIsThreadDeleted(true);
			toast.error('This conversation has been deleted');
			router.push('/');
		}
	}, [thread, threadId, isThreadDeleted, router]);

	// Load the thread's current model when thread data is available
	useEffect(() => {
		if (thread?.currentModel) {
			setModel(thread.currentModel as ModelId);
		}
	}, [thread?.currentModel]);

	const handleModelChange = useCallback(
		async (newModel: ModelId) => {
			// Prevent model changes if thread is deleted
			if (isThreadDeleted || (threadId && thread === null)) {
				return;
			}

			setModel(newModel);

			// Update the thread's model if we have a threadId
			if (threadId) {
				try {
					await updateThreadModel({
						threadId,
						model: newModel,
					});
				} catch (error) {
					console.error('Failed to update thread model:', error);
				}
			}
		},
		[threadId, updateThreadModel, isThreadDeleted, thread]
	);

	const handleSendMessage = useCallback(
		async (messageToSend: string) => {
			if (!messageToSend.trim()) return;

			// Prevent sending messages if thread is deleted
			if (isThreadDeleted || (threadId && thread === null)) {
				toast.error('Cannot send message: conversation has been deleted');
				return;
			}

			// Reset optimistic state
			setOptimisticMessage(null);

			try {
				let assistantMessageId: Id<'messages'>;
				let targetThreadId: Id<'threads'>;

				if (threadId) {
					targetThreadId = threadId;
					assistantMessageId = await prepareForStream({
						threadId: threadId,
						messageContent: messageToSend,
						model: model,
					});
				} else {
					const result = await createThreadAndPrepareForStream({
						messageContent: messageToSend,
						model: model,
					});
					assistantMessageId = result.assistantMessageId;
					targetThreadId = result.threadId;
					router.push(`/chat/${targetThreadId}`);
				}

				// Get the authentication token
				const token = await getToken({ template: 'convex' });

				// Make a POST request to the /stream HTTP endpoint
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/stream`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							...(token && { Authorization: `Bearer ${token}` }),
						},
						body: JSON.stringify({
							assistantMessageId,
							threadId: targetThreadId,
							model,
						}),
					}
				);

				if (!response.body) {
					throw new Error('Response body is null');
				}

				// Read the streaming response
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let accumulatedResponse = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					accumulatedResponse += decoder.decode(value);
					setOptimisticMessage({
						role: 'assistant',
						content: accumulatedResponse,
					});
				}
			} catch (error) {
				console.error('Failed to send message or stream response:', error);

				// Check if the error is due to thread not existing
				if (
					error instanceof Error &&
					error.message.includes('Thread not found')
				) {
					setIsThreadDeleted(true);
					toast.error('This conversation has been deleted');
					router.push('/');
				} else {
					toast.error('Failed to send message');
				}
			} finally {
				// Clear the optimistic message once the stream is fully handled
				setOptimisticMessage(null);
			}
		},
		[
			threadId,
			model,
			prepareForStream,
			createThreadAndPrepareForStream,
			router,
			getToken,
			isThreadDeleted,
			thread,
		]
	);

	return (
		<div className="w-full h-screen max-h-screen relative">
			<ChatContainer
				messages={messages}
				optimisticMessage={optimisticMessage}
			/>
			<ChatInput
				model={model}
				handleModelChange={handleModelChange}
				handleSendMessage={handleSendMessage}
			/>
		</div>
	);
}
