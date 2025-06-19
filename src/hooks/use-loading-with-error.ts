'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
	categorizeConvexError,
	getToastErrorMessage,
	type ErrorContext,
} from '@/lib/error-handling';

interface LoadingState {
	isLoading: boolean;
	error: Error | null;
	data: unknown | null;
	isRetrying: boolean;
	retryCount: number;
}

interface UseLoadingWithErrorOptions {
	context: ErrorContext;
	action?: string;
	showLoadingToast?: boolean;
	loadingMessage?: string;
	successMessage?: string;
	minLoadingTime?: number;
	maxLoadingTime?: number;
	onSuccess?: (data: unknown) => void;
	onError?: (error: Error) => void;
}

/**
 * Enhanced loading state management with error handling and user feedback
 * Provides consistent loading states across the application
 */
export function useLoadingWithError<T>(options: UseLoadingWithErrorOptions) {
	const {
		context,
		action,
		showLoadingToast = false,
		loadingMessage,
		successMessage,
		minLoadingTime = 500,
		maxLoadingTime = 30000,
		onSuccess,
		onError,
	} = options;

	const [state, setState] = useState<LoadingState>({
		isLoading: false,
		error: null,
		data: null,
		isRetrying: false,
		retryCount: 0,
	});

	const loadingStartTime = useRef<number | undefined>(undefined);
	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const toastId = useRef<string | number | undefined>(undefined);

	const completeLoading = useCallback(
		async (data: T | null, error: Error | null) => {
			const loadingTime = loadingStartTime.current
				? Date.now() - loadingStartTime.current
				: 0;
			const remainingTime = Math.max(0, minLoadingTime - loadingTime);

			// Ensure minimum loading time for better UX
			if (remainingTime > 0) {
				await new Promise((resolve) => setTimeout(resolve, remainingTime));
			}

			// Clear timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			setState((prev) => ({
				...prev,
				isLoading: false,
				data,
				error,
				isRetrying: false,
			}));

			// Dismiss loading toast
			if (toastId.current) {
				toast.dismiss(toastId.current);
				toastId.current = undefined;
			}

			// Handle success
			if (data && !error) {
				if (successMessage) {
					toast.success(successMessage);
				}
				onSuccess?.(data);
			}

			// Handle error
			if (error) {
				const errorType = categorizeConvexError(error);
				const errorMessage = getToastErrorMessage(errorType, context, action);
				toast.error(errorMessage);
				onError?.(error);
			}
		},
		[minLoadingTime, successMessage, context, action, onSuccess, onError]
	);

	const startLoading = useCallback(
		(retrying = false) => {
			loadingStartTime.current = Date.now();

			setState((prev) => ({
				...prev,
				isLoading: true,
				error: null,
				isRetrying: retrying,
				retryCount: retrying ? prev.retryCount + 1 : 0,
			}));

			// Show loading toast if enabled
			if (showLoadingToast && loadingMessage) {
				const message = retrying
					? `Retrying ${loadingMessage}... (attempt ${state.retryCount + 1})`
					: loadingMessage;

				toastId.current = toast.loading(message);
			}

			// Set maximum loading timeout
			if (maxLoadingTime > 0) {
				timeoutRef.current = setTimeout(() => {
					completeLoading(null, new Error('Operation timed out'));
				}, maxLoadingTime);
			}
		},
		[
			showLoadingToast,
			loadingMessage,
			state.retryCount,
			maxLoadingTime,
			completeLoading,
		]
	);

	const reset = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		if (toastId.current) {
			toast.dismiss(toastId.current);
			toastId.current = undefined;
		}

		setState({
			isLoading: false,
			error: null,
			data: null,
			isRetrying: false,
			retryCount: 0,
		});
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			if (toastId.current) {
				toast.dismiss(toastId.current);
			}
		};
	}, []);

	return {
		...state,
		startLoading,
		completeLoading,
		reset,
	};
}

/**
 * Wrapper that combines async operation with loading state management
 */
export function useAsyncWithLoading<T extends unknown[], R>(
	asyncFn: (...args: T) => Promise<R>,
	options: UseLoadingWithErrorOptions
) {
	const loadingState = useLoadingWithError<R>(options);

	const execute = useCallback(
		async (...args: T): Promise<R | null> => {
			try {
				loadingState.startLoading();
				const result = await asyncFn(...args);
				await loadingState.completeLoading(result, null);
				return result;
			} catch (error) {
				await loadingState.completeLoading(null, error as Error);
				throw error;
			}
		},
		[asyncFn, loadingState]
	);

	const retry = useCallback(
		async (...args: T): Promise<R | null> => {
			try {
				loadingState.startLoading(true);
				const result = await asyncFn(...args);
				await loadingState.completeLoading(result, null);
				return result;
			} catch (error) {
				await loadingState.completeLoading(null, error as Error);
				throw error;
			}
		},
		[asyncFn, loadingState]
	);

	return {
		execute,
		retry,
		...loadingState,
	};
}

/**
 * Hook for managing multiple concurrent loading states
 */
export function useMultipleLoadingStates() {
	const [states, setStates] = useState<Record<string, LoadingState>>({});

	const startLoading = useCallback((key: string) => {
		setStates((prev) => ({
			...prev,
			[key]: {
				...prev[key],
				isLoading: true,
				error: null,
			},
		}));
	}, []);

	const completeLoading = useCallback(
		(key: string, data: unknown | null = null, error: Error | null = null) => {
			setStates((prev) => ({
				...prev,
				[key]: {
					...prev[key],
					isLoading: false,
					data,
					error,
				},
			}));
		},
		[]
	);

	const resetState = useCallback((key: string) => {
		setStates((prev) => {
			const newStates = { ...prev };
			delete newStates[key];
			return newStates;
		});
	}, []);

	const resetAll = useCallback(() => {
		setStates({});
	}, []);

	const getState = useCallback(
		(key: string): LoadingState => {
			return (
				states[key] || {
					isLoading: false,
					error: null,
					data: null,
					isRetrying: false,
					retryCount: 0,
				}
			);
		},
		[states]
	);

	const isAnyLoading = Object.values(states).some((state) => state.isLoading);
	const hasAnyError = Object.values(states).some((state) => state.error);

	return {
		startLoading,
		completeLoading,
		resetState,
		resetAll,
		getState,
		isAnyLoading,
		hasAnyError,
		states,
	};
}
