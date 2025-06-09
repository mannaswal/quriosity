'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useConvexAuth, useMutation as useConvexMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useQuery as useConvexQuery } from 'convex/react';

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

	return useMutation({
		mutationFn: async ({ model }: { model: string }) => {
			return await mutation({ model });
		},
		onError: (error) => {
			console.error('Failed to update last model used:', error);
			// Optionally, show a toast notification
		},
	});
}
