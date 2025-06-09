'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	useQuery as useConvexQuery,
	useMutation as useConvexMutation,
	useConvexAuth,
} from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Thread } from '@/lib/types';
import { toast } from 'sonner';

/**
 * Query key factory for thread-related queries
 * This ensures consistent cache keys across the app
 */
export const threadKeys = {
	all: ['threads'] as const,
	lists: () => [...threadKeys.all, 'list'] as const,
	list: (userId?: string) => [...threadKeys.lists(), userId] as const,
	details: () => [...threadKeys.all, 'detail'] as const,
	detail: (id: string) => [...threadKeys.details(), id] as const,
};

/**
 * Hook to get all user threads with pure Convex (working!)
 */
export function useThreads() {
	const { isAuthenticated } = useConvexAuth();

	// Back to pure Convex for now - this works with authentication!
	return useConvexQuery(
		api.threads.getUserThreads,
		isAuthenticated ? {} : 'skip'
	);
}

/**
 * Hook to get a specific thread by ID
 */
export function useThread(threadId?: Id<'threads'>) {
	return useConvexQuery(
		api.threads.getThread,
		threadId ? { threadId } : 'skip'
	);
}

/**
 * Hook for pinning/unpinning threads with optimistic updates
 */
export function usePinThread() {
	const queryClient = useQueryClient();
	const pinThreadMutation = useConvexMutation(api.threads.pinThread);

	return useMutation({
		mutationFn: async ({
			threadId,
			pinned,
		}: {
			threadId: Id<'threads'>;
			pinned: boolean;
		}) => {
			return await pinThreadMutation({ threadId, pinned });
		},
		// Optimistic update
		onMutate: async ({ threadId, pinned }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: threadKeys.lists() });

			// Snapshot previous value
			const previousThreads = queryClient.getQueryData<Thread[]>(
				threadKeys.lists()
			);

			// Optimistically update cache
			queryClient.setQueryData<Thread[]>(threadKeys.lists(), (old) => {
				if (!old) return old;
				return old.map((thread) =>
					thread._id === threadId ? { ...thread, pinned } : thread
				);
			});

			// Update individual thread cache too
			queryClient.setQueryData(
				threadKeys.detail(threadId),
				(old: Thread | undefined) => {
					if (!old) return old;
					return { ...old, pinned };
				}
			);

			return { previousThreads };
		},
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousThreads) {
				queryClient.setQueryData(threadKeys.lists(), context.previousThreads);
			}
			toast.error('Failed to update thread');
		},
		onSuccess: (data, { pinned }) => {
			toast.success(pinned ? 'Thread pinned' : 'Thread unpinned');
		},
		onSettled: () => {
			// Always refetch after mutation
			queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
		},
	});
}

/**
 * Hook for deleting threads with optimistic updates
 */
export function useDeleteThread() {
	const queryClient = useQueryClient();
	const deleteThreadMutation = useConvexMutation(api.threads.deleteThread);

	return useMutation({
		mutationFn: async (threadId: Id<'threads'>) => {
			return await deleteThreadMutation({ threadId });
		},
		// Optimistic update
		onMutate: async (threadId) => {
			await queryClient.cancelQueries({ queryKey: threadKeys.lists() });

			const previousThreads = queryClient.getQueryData<Thread[]>(
				threadKeys.lists()
			);

			// Optimistically remove thread from cache
			queryClient.setQueryData<Thread[]>(threadKeys.lists(), (old) => {
				if (!old) return old;
				return old.filter((thread) => thread._id !== threadId);
			});

			// Remove from individual cache
			queryClient.removeQueries({ queryKey: threadKeys.detail(threadId) });

			return { previousThreads };
		},
		onError: (err, threadId, context) => {
			// Rollback on error
			if (context?.previousThreads) {
				queryClient.setQueryData(threadKeys.lists(), context.previousThreads);
			}
			toast.error('Failed to delete thread');
		},
		onSuccess: () => {
			toast.success('Thread deleted');
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
		},
	});
}

/**
 * Hook for renaming threads with optimistic updates
 */
export function useRenameThread() {
	const queryClient = useQueryClient();
	const renameThreadMutation = useConvexMutation(api.threads.renameThread);

	return useMutation({
		mutationFn: async ({
			threadId,
			newTitle,
		}: {
			threadId: Id<'threads'>;
			newTitle: string;
		}) => {
			return await renameThreadMutation({ threadId, newTitle });
		},
		// Optimistic update
		onMutate: async ({ threadId, newTitle }) => {
			await queryClient.cancelQueries({ queryKey: threadKeys.lists() });

			const previousThreads = queryClient.getQueryData<Thread[]>(
				threadKeys.lists()
			);

			// Optimistically update title in cache
			queryClient.setQueryData<Thread[]>(threadKeys.lists(), (old) => {
				if (!old) return old;
				return old.map((thread) =>
					thread._id === threadId ? { ...thread, title: newTitle } : thread
				);
			});

			// Update individual thread cache
			queryClient.setQueryData(
				threadKeys.detail(threadId),
				(old: Thread | undefined) => {
					if (!old) return old;
					return { ...old, title: newTitle };
				}
			);

			return { previousThreads };
		},
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousThreads) {
				queryClient.setQueryData(threadKeys.lists(), context.previousThreads);
			}
			toast.error('Failed to rename thread');
		},
		onSuccess: () => {
			toast.success('Thread renamed');
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
		},
	});
}
