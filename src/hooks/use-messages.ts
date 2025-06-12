'use client';

import {
	useQuery as useConvexQuery,
	useMutation as useConvexMutation,
	useConvexAuth,
} from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { ChatMessage } from '@/lib/types';
import { useRef } from 'react';

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
 * Hook for smooth streaming with Convex optimistic updates
 */
export function useStreamResponse() {
	// Initiate the stream
	const streamResponse = async (
		streamConfig: {
			streamUrl: string;
			token: string;
			payload: Record<string, string>;
		},
		threadId: Id<'threads'>,
		messageId: Id<'messages'>
	) => {
		try {
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

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let accumulatedContent = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				accumulatedContent += chunk; // doing nothing with the content for now
			}
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Stream was aborted');
				return;
			}
			throw error;
		}
	};
	return { streamResponse };
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
	const abortControllerRef = useRef<AbortController | null>(null);

	const regenerateMutation = useConvexMutation(
		api.messages.regenerateResponse
	).withOptimisticUpdate((localStore, args) => {
		const { userMessageId } = args;
		// The mutation will handle removing subsequent messages server-side
	});

	return async (args: {
		userMessageId: Id<'messages'>;
		threadId: Id<'threads'>;
	}) => {
		try {
			const result = await regenerateMutation({
				userMessageId: args.userMessageId,
			});
			const streamConfig = await getStreamConfig.mutateAsync(result);

			// Start streaming with optimistic updates
			await streamResponse(
				streamConfig,
				args.threadId,
				result.assistantMessageId
			);

			opts.onSuccess?.();
			return result;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Regenerate was aborted');
				return;
			}
			toast.error('Failed to regenerate response');
			opts.onError?.(error as Error);
			throw error;
		} finally {
			abortControllerRef.current = null;
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
	const abortControllerRef = useRef<AbortController | null>(null);

	const editMutation = useConvexMutation(api.messages.editAndResubmit);

	return async (args: {
		userMessageId: Id<'messages'>;
		threadId: Id<'threads'>;
		newContent: string;
	}) => {
		try {
			const result = await editMutation({
				userMessageId: args.userMessageId,
				newContent: args.newContent,
			});
			const streamConfig = await getStreamConfig.mutateAsync(result);

			// Start streaming with optimistic updates
			await streamResponse(
				streamConfig,
				args.threadId,
				result.assistantMessageId
			);

			opts.onSuccess?.();
			return result;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Edit and resubmit was aborted');
				return;
			}
			toast.error('Failed to edit message');
			opts.onError?.(error as Error);
			throw error;
		} finally {
			abortControllerRef.current = null;
		}
	};
}
