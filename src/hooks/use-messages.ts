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

/**
 * Hook to get messages for a thread
 */
export function useMessages(threadId?: Id<'threads'>) {
	const { isAuthenticated } = useConvexAuth();

	return useConvexQuery(
		api.messages.listByThread,
		threadId && isAuthenticated ? { threadId } : 'skip'
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
				const optimisticMessage = {
					_id: `temp-${Date.now()}` as Id<'messages'>,
					threadId,
					role: 'user' as const,
					content: messageContent,
					modelUsed: model,
					_creationTime: Date.now(),
				};

				localStore.setQuery(api.messages.listByThread, { threadId }, [
					...currentMessages,
					optimisticMessage,
				]);
			}
		}
	);
}

/**
 * Hook to regenerate an assistant's response.
 */
export function useRegenerate(opts: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();

	const regenerateMutation = useConvexMutation(
		api.messages.regenerateResponse
	).withOptimisticUpdate((localStore, args) => {
		const { userMessageId } = args;

		// We need to find the thread first to get messages
		// Since we only have userMessageId, we can't easily do optimistic updates here
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

			// Start the streaming request - Convex will handle database updates automatically
			await fetch(streamConfig.streamUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${streamConfig.token}`,
				},
				body: JSON.stringify(streamConfig.payload),
			});

			opts.onSuccess?.();
			return result;
		} catch (error) {
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

			// Start the streaming request - Convex will handle database updates automatically
			await fetch(streamConfig.streamUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${streamConfig.token}`,
				},
				body: JSON.stringify(streamConfig.payload),
			});

			opts.onSuccess?.();
			return result;
		} catch (error) {
			toast.error('Failed to edit message');
			opts.onError?.(error as Error);
			throw error;
		}
	};
}
