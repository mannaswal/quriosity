'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
	categorizeConvexError,
	getErrorRedirectPath,
	getToastErrorMessage,
	shouldRedirectOnError,
	getRedirectDelay,
	type ErrorContext,
} from '@/lib/error-handling';

interface UseQueryErrorHandlerOptions {
	context: ErrorContext;
	onError?: (error: Error) => void;
	showToast?: boolean;
	maxRetries?: number;
	retryDelay?: number;
}

/**
 * Hook for handling query errors with automatic retries and error boundaries
 * Specifically designed for Convex query error handling
 */
export function useQueryErrorHandler<T>(
	queryResult: T | undefined,
	error: Error | null,
	options: UseQueryErrorHandlerOptions
) {
	const router = useRouter();
	const {
		context,
		onError,
		showToast = true,
		maxRetries = 2,
		retryDelay = 1000,
	} = options;

	const [retryCount, setRetryCount] = useState(0);
	const [hasHandledError, setHasHandledError] = useState(false);
	const errorRef = useRef<Error | null>(null);

	useEffect(() => {
		// Reset retry count when query changes
		setRetryCount(0);
		setHasHandledError(false);
		errorRef.current = null;
	}, [JSON.stringify(queryResult)]);

	useEffect(() => {
		if (error && !hasHandledError && error !== errorRef.current) {
			errorRef.current = error;
			setHasHandledError(true);

			const errorType = categorizeConvexError(error);
			const redirectPath = getErrorRedirectPath(errorType, context);

			// Handle retryable errors
			if (errorType === 'network-error' && retryCount < maxRetries) {
				setTimeout(() => {
					setRetryCount((prev) => prev + 1);
					setHasHandledError(false);
				}, retryDelay * (retryCount + 1)); // Exponential backoff

				if (showToast) {
					toast.error(
						`Connection error. Retrying... (${retryCount + 1}/${maxRetries})`
					);
				}
				return;
			}

			// Handle non-retryable errors or max retries exceeded
			if (showToast) {
				const toastMessage = getToastErrorMessage(errorType, context);
				toast.error(toastMessage);
			}

			// Handle redirects for critical errors
			if (shouldRedirectOnError(errorType) && redirectPath) {
				const delay = getRedirectDelay(errorType);

				if (delay > 0) {
					setTimeout(() => {
						router.push(redirectPath);
					}, delay);
				} else {
					router.push(redirectPath);
				}
			}

			// Call custom error handler
			onError?.(error);

			// Log error in development
			if (process.env.NODE_ENV === 'development') {
				console.error(`[${context}] Query Error:`, error);
			}
		}
	}, [
		error,
		hasHandledError,
		context,
		onError,
		showToast,
		retryCount,
		maxRetries,
		retryDelay,
		router,
	]);

	return {
		retryCount,
		hasError: !!error,
		isRetrying: retryCount > 0 && retryCount < maxRetries,
	};
}

/**
 * Wrapper for Convex queries that includes automatic error handling
 */
export function useConvexQueryWithErrorHandler<T>(
	queryFn: () => T | undefined,
	options: UseQueryErrorHandlerOptions & {
		deps?: any[];
	}
) {
	const [error, setError] = useState<Error | null>(null);
	const [data, setData] = useState<T | undefined>(undefined);
	const { deps = [], ...errorOptions } = options;

	const errorHandler = useQueryErrorHandler(data, error, errorOptions);

	useEffect(() => {
		try {
			const result = queryFn();
			setData(result);
			setError(null);
		} catch (err) {
			setError(err as Error);
		}
	}, deps);

	return {
		data,
		error,
		...errorHandler,
	};
}
