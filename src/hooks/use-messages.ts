'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	useQuery as useConvexQuery,
	useMutation as useConvexMutation,
} from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { threadKeys } from './use-threads';

/**
 * Query key factory for message-related queries
 */
export const messageKeys = {
	all: ['messages'] as const,
	lists: () => [...messageKeys.all, 'list'] as const,
	list: (threadId: string) => [...messageKeys.lists(), threadId] as const,
};

/**
 * Hook to get messages for a specific thread with pure Convex
 */
export function useMessages(threadId?: Id<'threads'>) {
	// Back to pure Convex for now
	return useConvexQuery(
		api.messages.listByThread,
		threadId ? { threadId } : 'skip'
	);
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
			queryClient.setQueryData(messageKeys.list(threadId), (old: any) => {
				if (!old) return old;
				return [
					...old,
					{
						_id: `temp-${Date.now()}`, // Temporary ID
						threadId,
						role: 'user',
						content: messageContent,
						modelUsed: model,
						_creationTime: Date.now(),
					},
				];
			});

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
 * Hook for creating thread and preparing for stream
 */
export function useCreateThreadAndPrepareForStream() {
	const queryClient = useQueryClient();
	const createThreadMutation = useConvexMutation(
		api.threads.createThreadAndPrepareForStream
	);

	return useMutation({
		mutationFn: async (data: { messageContent: string; model: string }) => {
			return await createThreadMutation(data);
		},
		onSuccess: (result) => {
			// Invalidate threads list to show the new thread
			queryClient.invalidateQueries({ queryKey: threadKeys.lists() });

			// Pre-populate the new thread's message cache
			queryClient.setQueryData(messageKeys.list(result.threadId), [
				{
					_id: `temp-user-${Date.now()}`,
					threadId: result.threadId,
					role: 'user',
					content: '', // Will be filled by the actual data
					_creationTime: Date.now(),
				},
			]);
		},
	});
}

/**
 * Hook for updating thread model with optimistic updates
 */
export function useUpdateThreadModel() {
	const queryClient = useQueryClient();
	const updateModelMutation = useConvexMutation(api.threads.updateThreadModel);

	return useMutation({
		mutationFn: async (data: { threadId: Id<'threads'>; model: string }) => {
			return await updateModelMutation(data);
		},
		onMutate: async ({ threadId, model }) => {
			await queryClient.cancelQueries({
				queryKey: threadKeys.detail(threadId),
			});

			const previousThread = queryClient.getQueryData(
				threadKeys.detail(threadId)
			);

			// Optimistically update the thread's current model
			queryClient.setQueryData(threadKeys.detail(threadId), (old: any) => {
				if (!old) return old;
				return { ...old, currentModel: model };
			});

			return { previousThread };
		},
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousThread) {
				queryClient.setQueryData(
					threadKeys.detail(variables.threadId),
					context.previousThread
				);
			}
		},
		onSettled: (data, error, variables) => {
			queryClient.invalidateQueries({
				queryKey: threadKeys.detail(variables.threadId),
			});
		},
	});
}
