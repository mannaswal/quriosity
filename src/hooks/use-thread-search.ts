import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useDebounce } from './use-debounce';

/**
 * Custom hook for managing thread search functionality
 * Handles search state, debouncing, and API calls
 */
export function useThreadSearch() {
	const [searchQuery, setSearchQuery] = useState('');
	const [isSearchActive, setIsSearchActive] = useState(false);

	// Debounce search query to avoid too many API calls
	const debouncedSearchQuery = useDebounce(searchQuery, 300);

	// Only search if query is not empty and has at least 2 characters
	const shouldSearch = debouncedSearchQuery.length >= 2;

	const searchResults = useQuery(
		api.threads.searchThreadsByMessages,
		shouldSearch ? { searchQuery: debouncedSearchQuery } : 'skip'
	);

	// Update search active state
	useEffect(() => {
		setIsSearchActive(searchQuery.length > 0);
	}, [searchQuery]);

	const clearSearch = () => {
		setSearchQuery('');
		setIsSearchActive(false);
	};

	return {
		searchQuery,
		setSearchQuery,
		isSearchActive,
		searchResults: shouldSearch ? searchResults : undefined,
		isSearching: shouldSearch && searchResults === undefined,
		hasSearched: shouldSearch && searchResults !== undefined,
		clearSearch,
	};
}
