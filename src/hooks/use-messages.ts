'use client';

import {
	useQuery as useConvexQuery,
	useMutation as useConvexMutation,
	useConvexAuth,
	useQuery,
} from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { ChatMessage } from '@/lib/types';
import { useRef } from 'react';
import { useStreamingActions } from '@/lib/stores/streaming-store';
import { ModelId } from '@/lib/models';
import { useCreateThread, useThread, useThreadId } from './use-threads';
import { useRouter } from 'next/navigation';
import { useModel } from './use-model';

/**
 * Hook to get messages for a thread - simplified to just return Convex query
 */
export function useMessages(threadId?: Id<'threads'>): ChatMessage[] {
	const { isAuthenticated } = useConvexAuth();

	return (
		useConvexQuery(
			api.messages.listByThread,
			threadId && isAuthenticated ? { threadId } : 'skip'
		) ?? []
	);
}

/**
 * Hook for preparing stream with optimistic message addition
 */
export function usePrepareForStream() {
	return useConvexMutation(api.messages.prepareForStream).withOptimisticUpdate(
		(localStore, args) => {
			const { threadId, messageContent, model } = args;

			// Get current messages for this thread
			const currentMessages = localStore.getQuery(api.messages.listByThread, {
				threadId,
			});

			if (currentMessages) {
				// Add optimistic user message
				const optimisticUserMessage = {
					_id: `temp-user-${Date.now()}` as Id<'messages'>,
					threadId,
					role: 'user' as const,
					content: messageContent,
					modelUsed: model,
					_creationTime: Date.now(),
				};

				const newMessages = [...currentMessages, optimisticUserMessage];
				localStore.setQuery(
					api.messages.listByThread,
					{ threadId },
					newMessages
				);
			}
		}
	);
}

/**
 * Hook for smooth streaming with Zustand state management
 */
export function useStreamResponse() {
	const { startStream, addChunk, completeStream } = useStreamingActions();
	const abortControllerRef = useRef<AbortController | null>(null);

	// Initiate the stream
	const streamResponse = async (
		streamConfig: {
			streamUrl: string;
			resumeUrl: string;
			token: string;
			payload: {
				threadId: string;
				assistantMessageId: string;
				model: string;
				messages: ChatMessage[];
			};
			sessionId: string;
		},
		threadId: Id<'threads'>,
		messageId: Id<'messages'>
	) => {
		try {
			// Abort any existing stream
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			// Create new abort controller
			const abortController = new AbortController();
			abortControllerRef.current = abortController;

			// Start the stream session in Zustand
			startStream({
				messageId,
				threadId,
				sessionId: streamConfig.sessionId,
				abortController,
			});

			const response = await fetch(streamConfig.streamUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${streamConfig.token}`,
				},
				body: JSON.stringify(streamConfig.payload),
				signal: abortController.signal,
			});

			if (!response.ok) {
				throw new Error(`Stream failed: ${response.statusText}`);
			}

			if (!response.body) {
				throw new Error('Response body is null');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			try {
				while (true) {
					const { done, value } = await reader.read();

					if (done) {
						// Stream completed normally
						completeStream(messageId, 'complete');
						break;
					}

					// Decode and add chunk to Zustand store
					const chunk = decoder.decode(value, { stream: true });
					if (chunk) {
						addChunk(messageId, chunk);
					}
				}
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') {
					// Stream was aborted
					completeStream(messageId, 'stopped');
				} else {
					// Stream error
					console.error('Stream error:', error);
					completeStream(messageId, 'error');
				}
			} finally {
				reader.releaseLock();
			}
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Stream was aborted');
				completeStream(messageId, 'stopped');
				return;
			}
			console.error('Failed to start stream:', error);
			completeStream(messageId, 'error');
			throw error;
		} finally {
			abortControllerRef.current = null;
		}
	};

	return { streamResponse };
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
	const prepareForStream = usePrepareForStream();
	const { streamResponse } = useStreamResponse();
	const createThreadMutation = useCreateThread();
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();

	const sendMessage = async (messageContent: string) => {
		if (!model || thread?.isStreaming) return;

		try {
			let targetThreadId = thread?._id;

			// If there is no thread, we create a new one
			if (!targetThreadId) {
				const newThreadId = await createThreadMutation({
					messageContent: messageContent,
					model: model,
				});
				targetThreadId = newThreadId;
			}

			// If there is no thread, need to redirect to the new thread using the threadId we just created
			if (!thread) router.push(`/chat/${targetThreadId}`);

			// Sure that a thread exists, we prepare for streaming
			const { assistantMessageId, messages } = await prepareForStream({
				threadId: targetThreadId,
				messageContent: messageContent,
				model: model,
			});

			const streamConfig = await getStreamConfig.mutateAsync({
				threadId: targetThreadId,
				assistantMessageId,
				model,
			});

			// Populate messages for the stream
			streamConfig.payload.messages = messages;

			// Start streaming with optimistic updates
			await streamResponse(streamConfig, targetThreadId, assistantMessageId);

			opts?.onSuccess?.();

			return targetThreadId;
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
	const { streamResponse } = useStreamResponse();

	const regenerateMutation = useConvexMutation(api.messages.regenerateResponse);

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
			await streamResponse(streamConfig, args.threadId, assistantMessageId);

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
	const { streamResponse } = useStreamResponse();

	const editMutation = useConvexMutation(api.messages.editAndResubmit);

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
			await streamResponse(streamConfig, args.threadId, assistantMessageId);

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
