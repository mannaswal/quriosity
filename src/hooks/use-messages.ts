'use client';

import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { Message } from '@/lib/types';
import {
	useStreamingStoreActions,
	useStreamingMessage,
} from '@/stores/use-streaming-store';
import { useStopStream, useThread } from './use-threads';
import { useRouter } from 'next/navigation';
import { useModel } from './use-model';
import { ModelId } from '@/lib/models';
import { processDataStream } from 'ai';
import { getMessagesByThread } from 'convex/messages';

/**
 * Hook to get messages for a thread - now subscribes to both DB and streaming store
 */
export function useThreadMessages(threadId?: Id<'threads'>): Message[] {
	const { isAuthenticated } = useConvexAuth();

	// Subscribe to the streaming message for this thread
	const streamingMessage = useStreamingMessage(threadId);

	const dbMessages =
		useQuery(
			api.messages.getMessagesByThread,
			threadId && isAuthenticated ? { threadId } : 'skip'
		) ?? [];

	// Merge streaming store data for messages with pending/streaming status
	return dbMessages.map((message) => {
		if (message.status === 'pending' || message.status === 'streaming') {
			if (streamingMessage && streamingMessage.messageId === message._id) {
				return {
					...message,
					content: streamingMessage.content,
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
	const {
		updateStreamingContent,
		addStreamingMessage,
		removeStreamingMessage,
	} = useStreamingStoreActions();
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
		addStreamingMessage(threadId, assistantMessageId, '');

		try {
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
					updateStreamingContent(threadId, assistantMessageId, content);
				},
			});

			return content;
		} catch (error) {
			// Handle abort gracefully - don't treat as error
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Stream was aborted');
				return; // Don't update message status - client will handle
			}

			// Handle other errors - update message status to error
			try {
				await updateMessage({
					messageId: assistantMessageId,
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
	const streamMessage = useStreamMessage();
	const createThread = useMutation(api.threads.createThread);
	const setupThread = useMutation(api.threads.setupThread);

	const sendMessage = async (messageContent: string) => {
		if (thread?.status === 'streaming') return;

		try {
			let targetThreadId = thread?._id;

			// If there is no thread, we create a new one
			if (!targetThreadId) {
				targetThreadId = await createThread({
					messageContent: messageContent,
					model: model,
				});

				router.push(`/chat/${targetThreadId}`); // Redirect to the new thread
			}

			const { assistantMessageId, allMessages } = await setupThread({
				threadId: targetThreadId,
				model: model,
				messageContent: messageContent,
			});

			const messageHistory = allMessages.map((message) => ({
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
export function useRegenerate(opts?: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const regenerateMutation = useMutation(api.messages.regenerateResponse);
	const streamMessage = useStreamMessage();
	const {
		getStreamingMessage,
		removeStreamingMessage,
		updateStreamingContent,
		blockStreaming,
	} = useStreamingStoreActions();

	return async (args: {
		messageId: Id<'messages'>;
		threadId: Id<'threads'>;
	}) => {
		try {
			if (getStreamingMessage(args.threadId)) {
				updateStreamingContent(args.threadId, args.messageId, '');
				blockStreaming(args.threadId);
			}

			const { assistantMessageId, model, threadId, messages } =
				await regenerateMutation({
					messageId: args.messageId,
				});

			removeStreamingMessage(args.threadId);

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

			opts?.onSuccess?.();
			return { assistantMessageId, messages };
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
}

/**
 * Hook to edit a user message and regenerate the assistant's response.
 */
export function useEditAndResubmit(opts?: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const editMutation = useMutation(api.messages.editAndResubmit);
	const streamMessage = useStreamMessage();
	const {
		getStreamingMessage,
		removeStreamingMessage,
		updateStreamingContent,
		blockStreaming,
	} = useStreamingStoreActions();

	return async (args: {
		userMessageId: Id<'messages'>;
		threadId: Id<'threads'>;
		newContent: string;
	}) => {
		try {
			const currentStreamingMessage = getStreamingMessage(args.threadId);
			if (currentStreamingMessage) {
				updateStreamingContent(
					args.threadId,
					currentStreamingMessage.messageId,
					''
				);
				blockStreaming(args.threadId);
			}

			const { assistantMessageId, model, threadId, messages } =
				await editMutation({
					userMessageId: args.userMessageId,
					newContent: args.newContent,
				});

			removeStreamingMessage(args.threadId);

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

			opts?.onSuccess?.();
			return { assistantMessageId, messages };
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Edit and resubmit was aborted');
				return;
			}
			toast.error('Failed to edit message');
			opts?.onError?.(error as Error);
			throw error;
		}
	};
}
