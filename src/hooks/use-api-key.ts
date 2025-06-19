import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';

/**
 * Hook to check if user has configured their OpenRouter API key
 */
export function useApiKey() {
	const user = useQuery(api.users.getCurrentUser);

	const hasApiKey = Boolean(user?.openRouterApiKey);
	const isLoading = user === undefined;

	return {
		hasApiKey,
		isLoading,
		user,
	};
}
