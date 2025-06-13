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

/**
 * Hook to get messages for a thread - simplified to just return Convex query
 */
export function useOptimisticThreadMessages(
	threadId?: Id<'threads'>
): Message[] {
	const { isAuthenticated } = useConvexAuth();
	const { getMessage } = useStreamingStoreActions();

	const messages =
		useQuery(
			api.messages.getMessagesByThread,
			threadId && isAuthenticated ? { threadId } : 'skip'
		) ?? [];

	if (!messages.length) return [];

	const latestMessage = messages.at(-1);

	if (!latestMessage) return messages;

	const streamingMessage = getMessage(latestMessage._id);

	if (
		streamingMessage &&
		latestMessage.role === 'assistant' &&
		latestMessage.status !== 'done'
	) {
		return [
			...messages.slice(0, -1),
			{
				...latestMessage,
				content: streamingMessage.content,
			},
		];
	}

	return messages;
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
				console.log(content);
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
				content: 'HEY!',
				modelUsed: model,
				status: 'pending' as const,
			};

			// Insert messages into the database to prepare thread

			const { messages, insertedMessageIds } = await insertMessages({
				threadId: targetThreadId,
				messages: [userMessage, assistantMessage],
			});

			const messageHistory = messages.map((message) => ({
				id: message._id,
				role: message.role,
				content: message.content,
			}));

			createMessageStream(
				targetThreadId,
				model,
				insertedMessageIds[1],
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
