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
import { ModelId } from '@/lib/models';
import { ReasoningEffort } from '@/lib/types';
import {
	categorizeConvexError,
	getToastErrorMessage,
	getErrorRedirectPath,
	shouldRedirectOnError,
	getRedirectDelay,
} from '@/lib/error-handling';

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

	if (Array.isArray(threadId)) return threadId[0] as Id<'threads'>;

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
	const threadId = useThreadId();
	const router = useRouter();

	const updateThreadModelMutation = useConvexMutation(
		api.threads.updateThreadModel
	).withOptimisticUpdate((localStore, args) => {
		const { threadId, model, reasoningEffort } = args;

		// Optimistically update the specific thread
		const currentThread = localStore.getQuery(api.threads.getThreadById, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThreadById,
				{ threadId },
				{
					...currentThread,
					...(model ? { model } : {}),
					...(reasoningEffort ? { reasoningEffort } : {}),
				}
			);
		}

		// Also update in the threads list
		const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
		if (threadsList) {
			const updatedList = threadsList.map((thread) =>
				thread._id === threadId
					? {
							...thread,
							...(model && { model }),
							...(reasoningEffort && { reasoningEffort }),
					  }
					: thread
			);
			localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
		}
	});

	return async (args: {
		model?: ModelId;
		reasoningEffort?: ReasoningEffort;
	}) => {
		if (!threadId) return;

		try {
			await updateThreadModelMutation({
				threadId,
				...args,
			});
		} catch (error) {
			const errorType = categorizeConvexError(error as Error);
			const redirectPath = getErrorRedirectPath(errorType, 'thread');

			// Show appropriate error message
			const errorMessage = getToastErrorMessage(
				errorType,
				'thread',
				'update thread settings'
			);
			toast.error(errorMessage);

			// Handle redirects for critical errors
			if (shouldRedirectOnError(errorType) && redirectPath) {
				const delay = getRedirectDelay(errorType);
				setTimeout(() => {
					router.push(redirectPath);
				}, delay);
			}

			throw error;
		}
	};
}

/**
 * Hook for pinning/unpinning threads with optimistic updates
 */
export function usePinThread() {
	const router = useRouter();
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
				{
					...currentThread,
					pinned,
					...(pinned && !currentThread.archived && { archived: false }),
				}
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
		} catch (error) {
			const errorType = categorizeConvexError(error as Error);
			const redirectPath = getErrorRedirectPath(errorType, 'thread');

			// Show appropriate error message
			const action = args.pinned ? 'pin thread' : 'unpin thread';
			const errorMessage = getToastErrorMessage(errorType, 'thread', action);
			toast.error(errorMessage);

			// Handle redirects for critical errors
			if (shouldRedirectOnError(errorType) && redirectPath) {
				const delay = getRedirectDelay(errorType);
				setTimeout(() => {
					router.push(redirectPath);
				}, delay);
			}

			throw error;
		}
	};
}

/**
 * Hook for archiving threads with optimistic updates
 */
export function useArchiveThread() {
	const router = useRouter();
	const archiveMutation = useConvexMutation(
		api.threads.archiveThread
	).withOptimisticUpdate((localStore, args) => {
		const { threadId, archived } = args;

		// Update specific thread
		const currentThread = localStore.getQuery(api.threads.getThreadById, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThreadById,
				{ threadId },
				{ ...currentThread, archived }
			);
		}

		// Update threads list
		const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
		if (threadsList) {
			const updatedList = threadsList.map((thread) =>
				thread._id === threadId ? { ...thread, archived } : thread
			);
			localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
		}
	});

	return async (args: { threadId: Id<'threads'>; archived: boolean }) => {
		try {
			await archiveMutation(args);
		} catch (error) {
			const errorType = categorizeConvexError(error as Error);
			const redirectPath = getErrorRedirectPath(errorType, 'thread');

			// Show appropriate error message
			const action = args.archived ? 'archive thread' : 'unarchive thread';
			const errorMessage = getToastErrorMessage(errorType, 'thread', action);
			toast.error(errorMessage);

			// Handle redirects for critical errors
			if (shouldRedirectOnError(errorType) && redirectPath) {
				const delay = getRedirectDelay(errorType);
				setTimeout(() => {
					router.push(redirectPath);
				}, delay);
			}

			throw error;
		}
	};
}

/**
 * Hook for deleting threads with optimistic updates
 */
export function useDeleteThread() {
	const router = useRouter();
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
	});

	return async (threadId: Id<'threads'>) => {
		try {
			await deleteMutation({ threadId });
			toast.success('Thread deleted!');
		} catch (error) {
			const errorType = categorizeConvexError(error as Error);
			const redirectPath = getErrorRedirectPath(errorType, 'thread');

			// Show appropriate error message
			const errorMessage = getToastErrorMessage(
				errorType,
				'thread',
				'delete thread'
			);
			toast.error(errorMessage);

			// Handle redirects for critical errors
			if (shouldRedirectOnError(errorType) && redirectPath) {
				const delay = getRedirectDelay(errorType);
				setTimeout(() => {
					router.push(redirectPath);
				}, delay);
			}

			throw error;
		}
	};
}

/**
 * Hook for renaming threads with optimistic updates
 */
export function useRenameThread() {
	const router = useRouter();
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
			const errorType = categorizeConvexError(error as Error);
			const redirectPath = getErrorRedirectPath(errorType, 'thread');

			// Show appropriate error message
			const errorMessage = getToastErrorMessage(
				errorType,
				'thread',
				'rename thread'
			);
			toast.error(errorMessage);

			// Handle redirects for critical errors
			if (shouldRedirectOnError(errorType) && redirectPath) {
				const delay = getRedirectDelay(errorType);
				setTimeout(() => {
					router.push(redirectPath);
				}, delay);
			}

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
			router.push(`/chat/${newThreadId}`);
			return newThreadId;
		} catch (error) {
			const errorType = categorizeConvexError(error as Error);
			const redirectPath = getErrorRedirectPath(errorType, 'thread');

			// Show appropriate error message
			const errorMessage = getToastErrorMessage(
				errorType,
				'thread',
				'branch thread'
			);
			toast.error(errorMessage);

			// Handle redirects for critical errors
			if (shouldRedirectOnError(errorType) && redirectPath) {
				const delay = getRedirectDelay(errorType);
				setTimeout(() => {
					router.push(redirectPath);
				}, delay);
			}

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
	const markMessageAsStopped = useConvexMutation(
		api.messages.markMessageAsStopped
	);

	return async (threadId: Id<'threads'> | undefined) => {
		if (!threadId) return;

		try {
			// PATH A: This client is streaming (has optimistic data)
			const localStreamingData = getStreamingMessage(threadId);
			if (localStreamingData) {
				// Block updating optimistic data to prevent race condition
				blockStreaming(threadId);

				console.log('[HOOK] Marking message as stopped');
				// Patch message with current optimistic content
				await markMessageAsStopped({
					messageId: localStreamingData.messageId,
					content: localStreamingData.content,
					reasoning: localStreamingData.reasoning,
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

/**
 * Hook for updating a thread's project assignment
 */
export function useUpdateThreadProject() {
	const updateMutation = useConvexMutation(
		api.threads.updateThreadProject
	).withOptimisticUpdate((localStore, args) => {
		const { threadId, projectId } = args;

		// Update the specific thread
		const currentThread = localStore.getQuery(api.threads.getThreadById, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThreadById,
				{ threadId },
				{ ...currentThread, projectId }
			);
		}

		// Update threads list if it exists
		const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
		if (threadsList) {
			const updatedList = threadsList.map((thread) =>
				thread._id === threadId ? { ...thread, projectId } : thread
			);
			localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
		}
	});

	return async (args: {
		threadId: Id<'threads'>;
		projectId?: Id<'projects'>;
	}) => {
		try {
			await updateMutation(args);
			const actionText = args.projectId
				? 'added to project'
				: 'removed from project';
			toast.success(`Thread ${actionText} successfully!`, {
				description: args.projectId
					? 'New messages will include project context.'
					: undefined,
				duration: args.projectId ? 4000 : undefined,
			});
		} catch (error) {
			toast.error('Failed to update thread project');
			throw error;
		}
	};
}

/**
 * Hook for toggling thread public status with optimistic updates
 */
export function useToggleThreadPublic() {
	const toggleMutation = useConvexMutation(
		api.threads.toggleThreadPublic
	).withOptimisticUpdate((localStore, args) => {
		const { threadId, isPublic } = args;

		// Update the specific thread
		const currentThread = localStore.getQuery(api.threads.getThreadById, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThreadById,
				{ threadId },
				{
					...currentThread,
					isPublic,
					// Note: shareId will be updated when the mutation completes
				}
			);
		}

		// Update threads list if it exists
		const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
		if (threadsList) {
			const updatedList = threadsList.map((thread) =>
				thread._id === threadId ? { ...thread, isPublic } : thread
			);
			localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
		}
	});

	return async (args: { threadId: Id<'threads'>; isPublic: boolean }) => {
		try {
			const result = await toggleMutation(args);
			const actionText = args.isPublic ? 'shared publicly' : 'made private';
			toast.success(`Thread ${actionText} successfully!`, {
				description: args.isPublic
					? 'Share link generated. Anyone with the link can view this chat.'
					: 'Share link revoked. Chat is now private.',
				duration: 4000,
			});
			return result;
		} catch (error) {
			toast.error('Failed to update thread sharing');
			throw error;
		}
	};
}

/**
 * Hook for revoking thread sharing
 */
export function useRevokeThreadShare() {
	const revokeMutation = useConvexMutation(
		api.threads.revokeThreadShare
	).withOptimisticUpdate((localStore, args) => {
		const { threadId } = args;

		// Update the specific thread
		const currentThread = localStore.getQuery(api.threads.getThreadById, {
			threadId,
		});
		if (currentThread) {
			localStore.setQuery(
				api.threads.getThreadById,
				{ threadId },
				{
					...currentThread,
					isPublic: false,
					shareId: undefined,
				}
			);
		}

		// Update threads list if it exists
		const threadsList = localStore.getQuery(api.threads.getUserThreads, {});
		if (threadsList) {
			const updatedList = threadsList.map((thread) =>
				thread._id === threadId
					? { ...thread, isPublic: false, shareId: undefined }
					: thread
			);
			localStore.setQuery(api.threads.getUserThreads, {}, updatedList);
		}
	});

	return async (threadId: Id<'threads'>) => {
		try {
			await revokeMutation({ threadId });
			toast.success('Thread sharing revoked successfully!', {
				description: 'Share link is no longer active.',
			});
		} catch (error) {
			toast.error('Failed to revoke thread sharing');
			throw error;
		}
	};
}

/**
 * Hook to get public thread data by shareId (no auth required)
 */
export function usePublicThread(shareId: string | undefined) {
	return useConvexQuery(
		api.threads.getPublicThreadByShareId,
		shareId ? { shareId } : 'skip'
	);
}

/**
 * Hook to get public thread messages by shareId (no auth required)
 */
export function usePublicThreadMessages(shareId: string | undefined) {
	return useConvexQuery(
		api.threads.getPublicThreadMessages,
		shareId ? { shareId } : 'skip'
	);
}
