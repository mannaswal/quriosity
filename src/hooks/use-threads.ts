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
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { messageKeys } from './use-messages';

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
 * Hook to get a specific thread by ID, with optimistic updates.
 */
export function useThread(threadId?: Id<'threads'>) {
	const { isAuthenticated } = useConvexAuth();
	const queryClient = useQueryClient();

	// Get authoritative data from Convex
	const convexThread = useConvexQuery(
		api.threads.getThread,
		threadId && isAuthenticated ? { threadId } : 'skip'
	);

	// Sync Convex data to React Query cache
	useEffect(() => {
		if (threadId && convexThread !== undefined) {
			queryClient.setQueryData(threadKeys.detail(threadId), convexThread);
		}
	}, [convexThread, queryClient, threadId]);

	// UI subscribes to React Query cache for instant optimistic updates
	const { data: thread } = useQuery<Thread | null>({
		queryKey: threadKeys.detail(threadId!),
		enabled: !!threadId,
		staleTime: Infinity, // This cache is managed manually by the effect above
	});

	return thread;
}

/**
 * Hook for creating thread
 */
export function useCreateThread() {
	const queryClient = useQueryClient();
	const createThreadMutation = useConvexMutation(api.threads.createThread);

	return useMutation({
		mutationFn: async (data: { messageContent: string; model: string }) => {
			return await createThreadMutation(data);
		},
		onSuccess: (result, variables) => {
			// Invalidate threads list to show the new thread
			queryClient.invalidateQueries({ queryKey: threadKeys.lists() });

			// Pre-populate the new thread's message cache with user message
			const userMessage = {
				_id: `temp-user-${Date.now()}`,
				threadId: result.threadId,
				role: 'user',
				content: variables.messageContent,
				_creationTime: Date.now(),
			};

			queryClient.setQueryData(messageKeys.list(result.threadId), [
				userMessage,
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

/**
 * Hook for branching a thread from a specific message.
 */
export function useBranchThread() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const branchMutation = useConvexMutation(api.threads.branchFromMessage);

	return useMutation({
		mutationFn: async ({ messageId }: { messageId: Id<'messages'> }) => {
			return await branchMutation({ messageId });
		},

		onSuccess: (newThreadId) => {
			toast.success('Thread branched successfully!');
			// Invalidate queries to refetch the thread list
			queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
			// Redirect to the new branched thread
			router.push(`/chat/${newThreadId}`);
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to branch thread.');
			console.error('Branching error:', error);
		},
	});
}
