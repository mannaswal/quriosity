'use client';

import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { Message } from '@/lib/types';
import { useStreamingStoreActions } from '@/stores/use-streaming-store';
import { useThread } from './use-threads';
import { useRouter } from 'next/navigation';
import { useModel } from './use-model';
import { ModelId } from '@/lib/models';
import { processDataStream } from 'ai';
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
					status: message.status,
				};
			}
		}
		return message;
	});
}

/**
 * Reusable hook for streaming message content from the API
 * Handles status updates, streaming store management, and error cleanup
 */
function useStreamMessage() {
	const { updateMessageBody, removeMessage } = useStreamingStoreActions();
	const updateMessage = useMutation(api.messages.updateMessage);

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
		try {
			// Update thread status to streaming
			// Note: The convex mutations in messages.ts already handle thread status updates

			// Start with empty content in streaming store
			updateMessageBody(assistantMessageId, { content: '' });

			// // Update message status to streaming
			// await updateMessage({
			// 	messageId: assistantMessageId,
			// 	content: '',
			// 	status: 'pending',
			// });

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

			// Update final message status to done
			await updateMessage({
				messageId: assistantMessageId,
				content,
				status: 'done',
			});

			// Clean up streaming store
			removeMessage(assistantMessageId);

			return content;
		} catch (error) {
			// Clean up on error
			removeMessage(assistantMessageId);

			// Update message status to error
			try {
				await updateMessage({
					messageId: assistantMessageId,
					content: 'Error generating response',
					status: 'error',
				});
			} catch (updateError) {
				console.error('Failed to update message status on error:', updateError);
			}

			throw error;
		}
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
	const streamMessage = useStreamMessage();
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

			// Add to streaming store
			addMessage(assistantMessageId, {
				content: '',
			});

			const messageHistory = messages.map((message) => ({
				id: message._id,
				role: message.role,
				content: message.content,
			}));

			// Start streaming
			await streamMessage(
				targetThreadId,
				model,
				assistantMessageId,
				messageHistory
			);

			opts?.onSuccess?.();
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Send message was aborted');
				return;
			}
			toast.error('Failed to send message');
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
	const regenerateMutation = useMutation(api.messages.regenerateResponse);
	const streamMessage = useStreamMessage();
	const { addMessage } = useStreamingStoreActions();

	return async (args: {
		messageId: Id<'messages'>;
		threadId: Id<'threads'>;
	}) => {
		try {
			const { assistantMessageId, model, threadId, messages } =
				await regenerateMutation({
					messageId: args.messageId,
				});

			// Add to streaming store
			addMessage(assistantMessageId, {
				content: '',
			});

			const messageHistory = messages.map((message) => ({
				id: message._id,
				role: message.role,
				content: message.content,
			}));

			// Start streaming
			await streamMessage(
				threadId,
				model as ModelId,
				assistantMessageId,
				messageHistory
			);

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
	const editMutation = useMutation(api.messages.editAndResubmit);
	const streamMessage = useStreamMessage();
	const { addMessage } = useStreamingStoreActions();

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

			// Add to streaming store
			addMessage(assistantMessageId, {
				content: '',
			});

			const messageHistory = messages.map((message) => ({
				id: message._id,
				role: message.role,
				content: message.content,
			}));

			// Start streaming
			await streamMessage(
				threadId,
				model as ModelId,
				assistantMessageId,
				messageHistory
			);

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
