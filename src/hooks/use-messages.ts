'use client';

import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { trpc } from '@/server/trpc/client';
import { Message } from '@/lib/types';
import { useRef } from 'react';
import { useStreamingStoreActions } from '@/stores/use-streaming-store';
import { useThread } from './use-threads';
import { useRouter } from 'next/navigation';
import { useModel } from './use-model';
import { getStreamConfig } from '@/lib/stream';
import { ModelId } from '@/lib/models';
import { processDataStream } from 'ai';
import { useAuth } from '@clerk/nextjs';
import { useStreamingMessages } from '@/stores/use-streaming-store';

/**
 * Hook to get messages for a thread - now subscribes to both DB and streaming store
 */
export function useThreadMessages(threadId?: Id<'threads'>): Message[] {
	const { isAuthenticated } = useConvexAuth();

	// Subscribe to the streaming store so we get re-renders when it updates
	const streamingMessages = useStreamingMessages();

	const dbMessages =
		useQuery(
			api.messages.getMessagesByThread,
			threadId && isAuthenticated ? { threadId } : 'skip'
		) ?? [];

	// Merge streaming store data for messages with pending/in_progress status
	return dbMessages.map((message) => {
		if (message.status === 'pending' || message.status === 'streaming') {
			const streamingData = streamingMessages[message._id];
			if (streamingData) {
				return {
					...message,
					content: streamingData.content,
					status: 'streaming' as const,
				};
			}
		}
		return message;
	});
}

function useCreateMessageStream() {
	const { updateMessageBody, removeMessage } = useStreamingStoreActions();

	return async (
		threadId: Id<'threads'>,
		model: ModelId,
		assistantMessageId: Id<'messages'>,
		messageHistory: {
			id: Id<'messages'>;
			role: 'user' | 'assistant' | 'system';
			content: string;
		}[]
	) => {
		const response = await fetch('/api/chat', {
			method: 'POST',
			body: JSON.stringify({
				threadId,
				messageId: assistantMessageId,
				model,
				messages: messageHistory,
			}),
		});

		if (!response.ok) {
			throw new Error('Failed to create message stream');
		}

		let content = '';
		await processDataStream({
			stream: response.body!,
			onTextPart: (text) => {
				content += text;
				updateMessageBody(assistantMessageId, { content });
			},
		});

		return content;
	};
}

/**
 * Hook to send a new message
 */
export function useSendMessage(opts?: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const model = useModel();
	const router = useRouter();
	const thread = useThread();
	const createThread = useMutation(api.threads.createThread);
	const createMessageStream = useCreateMessageStream();
	const insertMessages = useMutation(api.messages.insertMessages);
	const { addMessage } = useStreamingStoreActions();

	const sendMessage = async (messageContent: string) => {
		if (thread?.status === 'streaming') return;

		try {
			let targetThreadId = thread?._id;

			// If there is no thread, we create a new one
			if (!targetThreadId) {
				const newThreadId = await createThread({
					messageContent: messageContent,
					model: model,
				});
				targetThreadId = newThreadId;
			}

			// If there is no thread, need to redirect to the new thread using the threadId we just created
			if (!thread) router.push(`/chat/${targetThreadId}`);

			const userMessage = {
				role: 'user' as const,
				content: messageContent,
				modelUsed: model,
				status: 'done' as const,
			};

			// Create assistant message
			const assistantMessage = {
				role: 'assistant' as const,
				content: '',
				modelUsed: model,
				status: 'pending' as const,
			};

			// Insert messages into the database to prepare thread

			const { messages, insertedMessageIds } = await insertMessages({
				threadId: targetThreadId,
				messages: [userMessage, assistantMessage],
			});

			const assistantMessageId = insertedMessageIds[1];

			addMessage(assistantMessageId, {
				content: '',
			});

			const messageHistory = messages.map((message) => ({
				id: message._id,
				role: message.role,
				content: message.content,
			}));

			createMessageStream(
				targetThreadId,
				model,
				assistantMessageId,
				messageHistory
			);

			opts?.onSuccess?.();
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Regenerate was aborted');
				return;
			}
			toast.error('Failed to regenerate response');
			opts?.onError?.(error as Error);
			throw error;
		}
	};

	return sendMessage;
}

/**
 * Hook to regenerate an assistant's response.
 */
export function useRegenerate(opts: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();
	// const { streamResponse } = useStreamResponse();

	const regenerateMutation = useMutation(api.messages.regenerateResponse);

	return async (args: {
		messageId: Id<'messages'>;
		threadId: Id<'threads'>;
	}) => {
		try {
			const { assistantMessageId, model, threadId, messages } =
				await regenerateMutation({
					messageId: args.messageId,
				});

			const streamConfig = await getStreamConfig.mutateAsync({
				threadId,
				assistantMessageId,
				model,
			});

			// Populate messages for the stream
			streamConfig.payload.messages = messages;

			// Start streaming with optimistic updates
			// await streamResponse(streamConfig, args.threadId, assistantMessageId);

			opts.onSuccess?.();
			return { assistantMessageId, messages };
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Regenerate was aborted');
				return;
			}
			toast.error('Failed to regenerate response');
			opts.onError?.(error as Error);
			throw error;
		}
	};
}

/**
 * Hook to edit a user message and regenerate the assistant's response.
 */
export function useEditAndResubmit(opts: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();
	// const { streamResponse } = useStreamResponse();

	const editMutation = useMutation(api.messages.editAndResubmit);

	return async (args: {
		userMessageId: Id<'messages'>;
		threadId: Id<'threads'>;
		newContent: string;
	}) => {
		try {
			const { assistantMessageId, model, threadId, messages } =
				await editMutation({
					userMessageId: args.userMessageId,
					newContent: args.newContent,
				});

			const streamConfig = await getStreamConfig.mutateAsync({
				threadId,
				assistantMessageId,
				model,
			});

			// Populate messages for the stream
			streamConfig.payload.messages = messages;

			// Start streaming with optimistic updates
			// await streamResponse(streamConfig, args.threadId, assistantMessageId);

			opts.onSuccess?.();
			return { assistantMessageId, messages };
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Edit and resubmit was aborted');
				return;
			}
			toast.error('Failed to edit message');
			opts.onError?.(error as Error);
			throw error;
		}
	};
}
