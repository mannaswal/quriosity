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
import {
	useStreamingMessage,
	useStreamingStoreActions,
} from '@/stores/use-streaming-store';

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
		api.threads.getThreadById,
		threadId && isAuthenticated ? { threadId } : 'skip'
	);
}

/**
 * Hook for updating thread model with optimistic updates
 */
export function useUpdateThreadModel() {
	return useConvexMutation(api.threads.updateThreadModel).withOptimisticUpdate(
		(localStore, args) => {
			const { threadId, model } = args;

			// Optimistically update the specific thread
			const currentThread = localStore.getQuery(api.threads.getThreadById, {
				threadId,
			});
			if (currentThread) {
				localStore.setQuery(
					api.threads.getThreadById,
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
		const currentThread = localStore.getQuery(api.threads.getThreadById, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThreadById,
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
		const currentThread = localStore.getQuery(api.threads.getThreadById, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThreadById,
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
 * Handles both local streams (with optimistic UX) and remote streams
 * Now uses stopThread mutation for both cases to properly abort AI stream server-side
 */
export function useStopStream() {
	const { getStreamingMessage, removeStreamingMessage, blockStreaming } =
		useStreamingStoreActions();
	const stopThread = useConvexMutation(api.threads.stopThread);
	const updateMessage = useConvexMutation(api.messages.updateMessage);

	return async (threadId: Id<'threads'> | undefined) => {
		if (!threadId) return;

		try {
			// PATH A: This client is streaming (has optimistic data)
			const localStreamingData = getStreamingMessage(threadId);
			if (localStreamingData) {
				// Block updating optimistic data to prevent race condition
				blockStreaming(threadId);

				// Patch message with current optimistic content
				await updateMessage({
					messageId: localStreamingData.messageId,
					content: localStreamingData.content,
					status: 'done',
					stopReason: 'stopped',
				});

				removeStreamingMessage(threadId);

				return;
			} else {
				await stopThread({ threadId });
			}
		} catch (error) {
			toast.error('Failed to stop stream');
			console.error('Stop stream error:', error);
		}
	};
}
