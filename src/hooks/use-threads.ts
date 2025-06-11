'use client';

import {
	useQuery as useConvexQuery,
	useMutation as useConvexMutation,
	useConvexAuth,
} from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';

/**
 * Hook to get all user threads
 */
export function useThreads() {
	const { isAuthenticated } = useConvexAuth();

	return useConvexQuery(
		api.threads.getUserThreads,
		isAuthenticated ? {} : 'skip'
	);
}

/**
 * Custom hook to extract the 'threadId' from the URL parameters.
 * Assumes the dynamic route segment is named `[threadId]`.
 *
 * Example: /threads/[threadId] -> /threads/123
 *
 * @returns The threadId as a string, or undefined if not found or on a non-thread page.
 */
export function useThreadId(): Id<'threads'> | undefined {
	const params = useParams();

	const threadId = params.threadId;

	if (Array.isArray(threadId)) {
		return threadId[0] as Id<'threads'>;
	}

	return threadId as Id<'threads'> | undefined;
}

/**
 * Hook to get a specific thread by ID
 */
export function useThread() {
	const threadId = useThreadId();
	const { isAuthenticated } = useConvexAuth();

	return useConvexQuery(
		api.threads.getThread,
		threadId && isAuthenticated ? { threadId } : 'skip'
	);
}

/**
 * Hook for creating thread
 */
export function useCreateThread() {
	return useConvexMutation(api.threads.createThread);
}

/**
 * Hook for updating thread model with optimistic updates
 */
export function useUpdateThreadModel() {
	return useConvexMutation(api.threads.updateThreadModel).withOptimisticUpdate(
		(localStore, args) => {
			const { threadId, model } = args;

			// Optimistically update the specific thread
			const currentThread = localStore.getQuery(api.threads.getThread, {
				threadId,
			});
			if (currentThread) {
				localStore.setQuery(
					api.threads.getThread,
					{ threadId },
					{ ...currentThread, currentModel: model }
				);
			}

			// Also update in the threads list
			const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
			if (threadsList) {
				const updatedList = threadsList.map((thread) =>
					thread._id === threadId ? { ...thread, currentModel: model } : thread
				);
				localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
			}
		}
	);
}

/**
 * Hook for pinning/unpinning threads with optimistic updates
 */
export function usePinThread() {
	const pinMutation = useConvexMutation(
		api.threads.pinThread
	).withOptimisticUpdate((localStore, args) => {
		const { threadId, pinned } = args;

		// Update specific thread
		const currentThread = localStore.getQuery(api.threads.getThread, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThread,
				{ threadId },
				{ ...currentThread, pinned }
			);
		}

		// Update threads list
		const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
		if (threadsList) {
			const updatedList = threadsList.map((thread) =>
				thread._id === threadId ? { ...thread, pinned } : thread
			);
			localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
		}
	});

	return async (args: { threadId: Id<'threads'>; pinned: boolean }) => {
		try {
			await pinMutation(args);
			toast.success(args.pinned ? 'Thread pinned' : 'Thread unpinned');
		} catch (error) {
			toast.error('Failed to update thread');
			throw error;
		}
	};
}

/**
 * Hook for deleting threads with optimistic updates
 */
export function useDeleteThread() {
	const deleteMutation = useConvexMutation(
		api.threads.deleteThread
	).withOptimisticUpdate((localStore, args) => {
		const { threadId } = args;

		// Remove from threads list
		const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
		if (threadsList) {
			const updatedList = threadsList.filter(
				(thread) => thread._id !== threadId
			);
			localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
		}

		// The individual thread query will naturally become undefined when deleted
	});

	return async (threadId: Id<'threads'>) => {
		try {
			await deleteMutation({ threadId });
			toast.success('Thread deleted');
		} catch (error) {
			toast.error('Failed to delete thread');
			throw error;
		}
	};
}

/**
 * Hook for renaming threads with optimistic updates
 */
export function useRenameThread() {
	const renameMutation = useConvexMutation(
		api.threads.renameThread
	).withOptimisticUpdate((localStore, args) => {
		const { threadId, newTitle } = args;

		// Update specific thread
		const currentThread = localStore.getQuery(api.threads.getThread, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThread,
				{ threadId },
				{ ...currentThread, title: newTitle }
			);
		}

		// Update threads list
		const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
		if (threadsList) {
			const updatedList = threadsList.map((thread) =>
				thread._id === threadId ? { ...thread, title: newTitle } : thread
			);
			localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
		}
	});

	return async (args: { threadId: Id<'threads'>; newTitle: string }) => {
		try {
			await renameMutation(args);
			toast.success('Thread renamed');
		} catch (error) {
			toast.error('Failed to rename thread');
			throw error;
		}
	};
}

/**
 * Hook for branching a thread from a specific message.
 */
export function useBranchThread() {
	const router = useRouter();
	const branchMutation = useConvexMutation(api.threads.branchFromMessage);

	return async (args: { messageId: Id<'messages'> }) => {
		try {
			const newThreadId = await branchMutation(args);
			toast.success('Thread branched successfully!');
			router.push(`/chat/${newThreadId}`);
			return newThreadId;
		} catch (error) {
			toast.error('Failed to branch thread.');
			console.error('Branching error:', error);
			throw error;
		}
	};
}

/**
 * Hook for stopping an active stream
 */
export function useStopStream() {
	const stopMutation = useConvexMutation(
		api.messages.stopStream
	).withOptimisticUpdate((localStore, args) => {
		const { threadId } = args;

		// Optimistically update the thread to show streaming stopped
		const currentThread = localStore.getQuery(api.threads.getThread, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThread,
				{ threadId },
				{ ...currentThread, isStreaming: false }
			);
		}

		// Also update in the threads list
		const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
		if (threadsList) {
			const updatedList = threadsList.map((thread) =>
				thread._id === threadId ? { ...thread, isStreaming: false } : thread
			);
			localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
		}
	});

	return async (threadId: Id<'threads'>) => {
		try {
			await stopMutation({ threadId });
		} catch (error) {
			toast.error('Failed to stop stream');
			throw error;
		}
	};
}
