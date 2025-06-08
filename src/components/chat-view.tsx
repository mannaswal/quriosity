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

interface ChatViewProps {
	threadId?: Id<'threads'>;
}

export function ChatView({ threadId }: ChatViewProps) {
	const router = useRouter();
	const { getToken } = useAuth();
	const [model, setModel] = useState('google/gemini-2.0-flash-001');
	const [optimisticMessage, setOptimisticMessage] =
		useState<OptimisticMessage | null>(null);

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

	// Load the thread's current model when thread data is available
	useEffect(() => {
		if (thread?.currentModel) {
			setModel(thread.currentModel);
		}
	}, [thread?.currentModel]);

	const handleModelChange = useCallback(
		async (newModel: string) => {
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
		[threadId, updateThreadModel]
	);

	const handleSendMessage = useCallback(
		async (messageToSend: string) => {
			if (!messageToSend.trim()) return;

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
				// Optionally, show an error toast to the user
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
