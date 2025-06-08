'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/chat-container';
import { ChatInput } from '@/components/chat-input';
import { useAuth } from '@clerk/nextjs';

interface ChatViewProps {
	threadId?: Id<'threads'>;
}

export function ChatView({ threadId }: ChatViewProps) {
	const router = useRouter();
	const { getToken } = useAuth();
	const [message, setMessage] = useState('');
	const [model, setModel] = useState('google/gemini-2.0-flash-001');
	const [optimisticMessage, setOptimisticMessage] = useState<{
		role: 'assistant';
		content: string;
	} | null>(null);

	const messages =
		useQuery(api.messages.listByThread, threadId ? { threadId } : 'skip') ?? [];

	const prepareForStream = useMutation(api.messages.prepareForStream);
	const createThreadAndPrepareForStream = useMutation(
		api.threads.createThreadAndPrepareForStream
	);

	const handleSendMessage = async () => {
		if (!message) return;

		// Clear the input and reset optimistic state
		const messageToSend = message;
		setMessage('');
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
	};

	return (
		<div className="w-full h-screen max-h-screen relative">
			<ChatContainer
				messages={messages}
				optimisticMessage={optimisticMessage}
			/>

			<ChatInput
				message={message}
				model={model}
				handleMessageChange={setMessage}
				handleModelChange={setModel}
				handleSendMessage={handleSendMessage}
			/>
		</div>
	);
}
