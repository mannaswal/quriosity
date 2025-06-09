'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/chat-container';
import { ChatInput } from '@/components/chat-input';
import { OptimisticMessage } from '@/lib/types';
import { toast } from 'sonner';
import { ModelId } from '@/lib/models';
import { trpc } from '@/lib/trpc/client';
import {
	useMessages,
	usePrepareForStream,
	useCreateThreadAndPrepareForStream,
	useUpdateThreadModel,
} from '@/hooks/use-messages';
import { useThread } from '@/hooks/use-threads';
import { Id } from '../../convex/_generated/dataModel';

interface ChatViewProps {
	threadId?: Id<'threads'>;
}

export function ChatView({ threadId }: ChatViewProps) {
	const router = useRouter();
	const [optimisticMessage, setOptimisticMessage] =
		useState<OptimisticMessage | null>(null);
	const [isThreadDeleted, setIsThreadDeleted] = useState(false);

	// Back to pure Convex (working with auth!)
	const messages = useMessages(threadId) ?? [];
	const thread = useThread(threadId);

	const [model, setModel] = useState<ModelId>(
		(thread?.currentModel as ModelId) ?? 'google/gemini-2.0-flash-001'
	);

	const prepareForStreamMutation = usePrepareForStream();
	const createThreadAndPrepareForStreamMutation =
		useCreateThreadAndPrepareForStream();
	const updateThreadModelMutation = useUpdateThreadModel();

	// tRPC mutation for streaming configuration
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();

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
				updateThreadModelMutation.mutate({
					threadId,
					model: newModel,
				});
			}
		},
		[threadId, updateThreadModelMutation, isThreadDeleted, thread]
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
					assistantMessageId = await prepareForStreamMutation.mutateAsync({
						threadId: threadId,
						messageContent: messageToSend,
						model: model,
					});
				} else {
					const result =
						await createThreadAndPrepareForStreamMutation.mutateAsync({
							messageContent: messageToSend,
							model: model,
						});
					assistantMessageId = result.assistantMessageId;
					targetThreadId = result.threadId;
					router.push(`/chat/${targetThreadId}`);
				}

				// Get stream configuration with type safety via tRPC
				const streamConfig = await getStreamConfig.mutateAsync({
					threadId: targetThreadId,
					assistantMessageId,
					model,
				});

				// Make a POST request to the /stream HTTP endpoint using the config
				const response = await fetch(streamConfig.streamUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${streamConfig.token}`,
					},
					body: JSON.stringify(streamConfig.payload),
				});

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
			prepareForStreamMutation,
			createThreadAndPrepareForStreamMutation,
			router,
			getStreamConfig,
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
