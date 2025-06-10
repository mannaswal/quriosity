'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	useQuery as useConvexQuery,
	useMutation as useConvexMutation,
	useConvexAuth,
} from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ChatMessage } from '@/lib/types';
import { toast } from 'sonner';
import { threadKeys } from './use-threads';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { handleStreamResponse } from '@/lib/stream-helper';

/**
 * Query key factory for message-related queries
 */
export const messageKeys = {
	all: ['messages'] as const,
	lists: () => [...messageKeys.all, 'list'] as const,
	list: (threadId?: string) => [...messageKeys.lists(), threadId] as const,
};

/**
 * Hook to get messages for a thread, with optimistic updates.
 * This is now the primary hook for displaying messages.
 */
export function useMessages(threadId?: Id<'threads'>) {
	const { isAuthenticated } = useConvexAuth();
	const queryClient = useQueryClient();

	// Get the authoritative list of messages from the server via Convex
	const convexMessages = useConvexQuery(
		api.messages.listByThread,
		threadId && isAuthenticated ? { threadId } : 'skip'
	);

	// When the authoritative server data changes, sync it to the React Query cache.
	// This ensures the cache is up-to-date with the ground truth from Convex.
	useEffect(() => {
		if (convexMessages !== undefined) {
			queryClient.setQueryData(messageKeys.list(threadId), convexMessages);
		}
	}, [convexMessages, queryClient, threadId]);

	// The UI subscribes to the React Query cache via useQuery.
	// This provides instant updates from setQueryData calls during the stream,
	// ensuring a smooth rendering experience.
	const { data: messages } = useQuery<ChatMessage[]>({
		queryKey: messageKeys.list(threadId),
		// No queryFn is needed as we manage the cache manually.
		// It's populated by the useEffect above or the streaming logic in mutations.
		initialData: () => {
			// Initialize with data already in cache if available
			return queryClient.getQueryData(messageKeys.list(threadId)) ?? [];
		},
		enabled: !!threadId,
		// Ensure it doesn't try to refetch on its own
		staleTime: Infinity,
	});

	return messages;
}

/**
 * Hook for preparing stream with optimistic message addition
 */
export function usePrepareForStream() {
	const queryClient = useQueryClient();
	const prepareForStreamMutation = useConvexMutation(
		api.messages.prepareForStream
	);

	return useMutation({
		mutationFn: async (data: {
			threadId: Id<'threads'>;
			messageContent: string;
			model: string;
		}) => {
			return await prepareForStreamMutation(data);
		},
		onMutate: async ({ threadId, messageContent, model }) => {
			// Cancel outgoing refetches for this thread's messages
			await queryClient.cancelQueries({ queryKey: messageKeys.list(threadId) });

			// Snapshot previous messages
			const previousMessages = queryClient.getQueryData(
				messageKeys.list(threadId)
			);

			// Optimistically add user message to cache
			queryClient.setQueryData(
				messageKeys.list(threadId),
				(messageHistory: ChatMessage[]) => {
					if (!messageHistory) return messageHistory;
					return [
						...messageHistory,
						{
							_id: `temp-${Date.now()}`, // Temporary ID
							threadId,
							role: 'user',
							content: messageContent,
							modelUsed: model,
							_creationTime: Date.now(),
						},
					];
				}
			);

			return { previousMessages };
		},
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousMessages) {
				queryClient.setQueryData(
					messageKeys.list(variables.threadId),
					context.previousMessages
				);
			}
		},
		onSettled: (data, error, variables) => {
			// Always refetch after mutation to get the real data
			queryClient.invalidateQueries({
				queryKey: messageKeys.list(variables.threadId),
			});
		},
	});
}

/**
 * Hook to regenerate an assistant's response.
 */
export function useRegenerate(opts: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const queryClient = useQueryClient();
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();
	const regenerateMutation = useConvexMutation(api.messages.regenerateResponse);

	return useMutation({
		mutationFn: async ({
			userMessageId,
			threadId,
		}: {
			userMessageId: Id<'messages'>;
			threadId: Id<'threads'>;
		}) => {
			const queryKey = messageKeys.list(threadId);

			// Find the user message in the cache
			const userMessage = queryClient
				.getQueryData<ChatMessage[]>(queryKey)
				?.find((m) => m._id === userMessageId);

			if (!userMessage) {
				throw new Error('Message to regenerate not found in cache.');
			}

			const originalMessages =
				queryClient.getQueryData<ChatMessage[]>(queryKey);

			// Optimistically remove all messages after the one we're retrying
			queryClient.setQueryData<ChatMessage[]>(
				queryKey,
				(old) =>
					old?.filter((m) => m._creationTime <= userMessage._creationTime) ?? []
			);

			try {
				const result = await regenerateMutation({ userMessageId });
				const streamConfig = await getStreamConfig.mutateAsync(result);
				await handleStreamResponse({ streamConfig, queryClient });
				return result;
			} catch (error) {
				// Rollback on error
				queryClient.setQueryData(queryKey, originalMessages);
				throw error; // Re-throw to be caught by onError
			}
		},
		onSuccess: () => {
			opts.onSuccess?.();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to regenerate response');
			opts.onError?.(error);
		},
		onSettled: (data) => {
			if (data) {
				queryClient.invalidateQueries({
					queryKey: messageKeys.list(data.threadId),
				});
			}
		},
	});
}

/**
 * Hook to edit a user message and regenerate the assistant's response.
 */
export function useEditAndResubmit(opts: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const queryClient = useQueryClient();
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();
	const editMutation = useConvexMutation(api.messages.editAndResubmit);

	return useMutation({
		mutationFn: async ({
			userMessageId,
			threadId,
			newContent,
		}: {
			userMessageId: Id<'messages'>;
			threadId: Id<'threads'>;
			newContent: string;
		}) => {
			const queryKey = messageKeys.list(threadId);
			const originalMessages =
				queryClient.getQueryData<ChatMessage[]>(queryKey);

			// Optimistically update the UI
			queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
				if (!old) return [];
				const userMessageIndex = old.findIndex((m) => m._id === userMessageId);
				if (userMessageIndex === -1) return old;

				// Update the content of the user message
				const updatedMessages = old.map((m, i) =>
					i === userMessageIndex ? { ...m, content: newContent } : m
				);

				// Remove all messages after the user message
				return updatedMessages.slice(0, userMessageIndex + 1);
			});

			try {
				const result = await editMutation({ userMessageId, newContent });
				const streamConfig = await getStreamConfig.mutateAsync(result);
				await handleStreamResponse({ streamConfig, queryClient });
				return result;
			} catch (error) {
				// Rollback on error
				queryClient.setQueryData(queryKey, originalMessages);
				throw error; // Re-throw to be caught by onError
			}
		},
		onSuccess: () => {
			opts.onSuccess?.();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to edit message');
			opts.onError?.(error);
		},
		onSettled: (data) => {
			if (data) {
				queryClient.invalidateQueries({
					queryKey: messageKeys.list(data.threadId),
				});
			}
		},
	});
}
