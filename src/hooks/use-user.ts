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
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
	categorizeConvexError,
	getToastErrorMessage,
} from '@/lib/error-handling';

/**
 * Hook to get the current user's data.
 * Enhanced to handle the case where user is authenticated through Clerk
 * but doesn't have a user document yet - automatically redirects to /auth/complete
 */
export function useCurrentUser() {
	const { isAuthenticated } = useConvexAuth();
	const { isSignedIn, isLoaded: clerkLoaded } = useUser();
	const router = useRouter();

	const user = useConvexQuery(
		api.users.getCurrentUser,
		isAuthenticated ? {} : 'skip'
	);

	useEffect(() => {
		// Only check when all loading states are complete
		if (!clerkLoaded || !isAuthenticated) return;

		// Critical scenario: User is signed in through Clerk AND authenticated through Convex
		// but the user query returned null (no user document exists)
		if (isSignedIn && isAuthenticated && user === null) {
			console.log(
				'🔄 User authenticated but no user document found. Redirecting to /auth/complete...'
			);

			// Silent redirect - no toast needed since this should be seamless
			router.replace('/auth/complete');
		}
	}, [isSignedIn, isAuthenticated, user, clerkLoaded, router]);

	return user;
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
