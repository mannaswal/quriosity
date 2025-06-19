'use client';

import { useConvexAuth, useMutation as useConvexMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useQuery as useConvexQuery } from 'convex/react';
import { ReasoningEffort } from '@/lib/types';
import {
	useTempActions,
	useTempUseWebSearch,
} from '@/stores/use-temp-data-store';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
	categorizeConvexError,
	getToastErrorMessage,
} from '@/lib/error-handling';

/**
 * Hook to get the current user's data.
 */
export function useCurrentUser() {
	const { isAuthenticated } = useConvexAuth();
	return useConvexQuery(
		api.users.getCurrentUser,
		isAuthenticated ? {} : 'skip'
	);
}

/**
 * Hook to update the user's last used model.
 */
export function useUpdateLastModelUsed() {
	const mutation = useConvexMutation(api.users.updateLastModelUsed);

	return async (args: {
		model?: string;
		reasoningEffort?: ReasoningEffort;
	}) => {
		try {
			return await mutation(args);
		} catch (error) {
			const errorType = categorizeConvexError(error as Error);
			const errorMessage = getToastErrorMessage(
				errorType,
				'user',
				'update model preference'
			);
			toast.error(errorMessage);
			console.error('Failed to update last model used:', error);
			throw error;
		}
	};
}

/**
 * Hook to update the user's web search preference.
 */
export function useUpdateUseWebSearch() {
	const mutation = useConvexMutation(api.users.updateUseWebSearch);

	return async (useWebSearch: boolean) => {
		try {
			return await mutation({ useWebSearch });
		} catch (error) {
			const errorType = categorizeConvexError(error as Error);
			const errorMessage = getToastErrorMessage(
				errorType,
				'user',
				'update web search preference'
			);
			toast.error(errorMessage);
			console.error('Failed to update web search preference:', error);
			throw error;
		}
	};
}

/**
 * Hook for getting and managing the user's web search preference
 * Synchronizes between temp store and user preference in database
 */
export function useWebSearch() {
	const user = useCurrentUser();
	const tempUseWebSearch = useTempUseWebSearch();
	const { setUseWebSearch } = useTempActions();

	// Get the actual preference: user's saved preference or temp preference
	const useWebSearch = user?.useWebSearch ?? tempUseWebSearch ?? false;

	// Sync temp store with user preference when user data loads
	useEffect(() => {
		if (user?.useWebSearch !== undefined) {
			setUseWebSearch(user.useWebSearch);
		}
	}, [user?.useWebSearch, setUseWebSearch]);

	return useWebSearch;
}

/**
 * Hook to update the user's web search preference
 * Updates both temp store, database, and current thread immediately
 */
export function useUpdateWebSearch() {
	const { setUseWebSearch } = useTempActions();
	const updateUseWebSearch = useUpdateUseWebSearch();

	return async (useWebSearch: boolean) => {
		// Update temp store immediately for UI responsiveness
		setUseWebSearch(useWebSearch);

		// Update database and thread
		try {
			await updateUseWebSearch(useWebSearch);
		} catch (error) {
			const errorType = categorizeConvexError(error as Error);
			const errorMessage = getToastErrorMessage(
				errorType,
				'user',
				'update web search setting'
			);
			toast.error(errorMessage);
			console.error('Failed to update web search preference:', error);
			// Revert temp store on error
			setUseWebSearch(!useWebSearch);
			throw error;
		}
	};
}
