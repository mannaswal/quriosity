'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
	categorizeConvexError,
	getToastErrorMessage,
	type ErrorContext,
} from '@/lib/error-handling';

interface RetryOptions {
	maxRetries?: number;
	baseDelay?: number;
	maxDelay?: number;
	backoffMultiplier?: number;
	retryableErrors?: string[];
}

interface UseRetryMechanismOptions extends RetryOptions {
	context: ErrorContext;
	action?: string;
	onRetry?: (retryCount: number, error: Error) => void;
	onMaxRetriesExceeded?: (error: Error) => void;
}

/**
 * Hook for implementing retry mechanism with exponential backoff
 * Useful for network operations and temporary failures
 */
export function useRetryMechanism<T extends unknown[], R>(
	operation: (...args: T) => Promise<R>,
	options: UseRetryMechanismOptions
) {
	const {
		maxRetries = 3,
		baseDelay = 1000,
		maxDelay = 30000,
		backoffMultiplier = 2,
		retryableErrors = ['network', 'timeout', 'connection'],
		context,
		action,
		onRetry,
		onMaxRetriesExceeded,
	} = options;

	const [isRetrying, setIsRetrying] = useState(false);
	const [retryCount, setRetryCount] = useState(0);
	const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const isRetryableError = useCallback(
		(error: Error): boolean => {
			const errorType = categorizeConvexError(error);

			// Always retry network errors
			if (errorType === 'network-error') return true;

			// Check if error message contains retryable keywords
			const message = error.message.toLowerCase();
			return retryableErrors.some((keyword) => message.includes(keyword));
		},
		[retryableErrors]
	);

	const calculateDelay = useCallback(
		(attempt: number): number => {
			const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
			return Math.min(delay, maxDelay);
		},
		[baseDelay, backoffMultiplier, maxDelay]
	);

	const executeWithRetry = useCallback(
		async (...args: T): Promise<R> => {
			let lastError: Error = new Error('Operation failed');
			let attempt = 0;

			while (attempt <= maxRetries) {
				try {
					setRetryCount(attempt);

					// If this is a retry, show loading state
					if (attempt > 0) {
						setIsRetrying(true);
					}

					const result = await operation(...args);

					// Success - reset state
					setIsRetrying(false);
					setRetryCount(0);
					if (retryTimeoutRef.current) {
						clearTimeout(retryTimeoutRef.current);
					}

					return result;
				} catch (error) {
					lastError = error as Error;

					// Don't retry if max attempts reached
					if (attempt >= maxRetries) {
						break;
					}

					// Don't retry if error is not retryable
					if (!isRetryableError(lastError)) {
						break;
					}

					// Calculate delay and show retry message
					const delay = calculateDelay(attempt);
					const nextAttempt = attempt + 1;

					// Call retry callback
					onRetry?.(nextAttempt, lastError);

					// Show retry toast
					const timeInSeconds = Math.ceil(delay / 1000);
					toast.loading(
						`Retrying ${
							action || 'operation'
						}... (${nextAttempt}/${maxRetries}) - ${timeInSeconds}s`,
						{
							duration: delay,
							id: `retry-${context}-${nextAttempt}`,
						}
					);

					// Wait before retrying
					await new Promise((resolve) => {
						retryTimeoutRef.current = setTimeout(resolve, delay);
					});

					attempt++;
				}
			}

			// All retries exhausted
			setIsRetrying(false);
			setRetryCount(0);

			// Dismiss any retry toasts
			toast.dismiss(`retry-${context}-${retryCount}`);

			// Call max retries callback
			onMaxRetriesExceeded?.(lastError);

			// Show final error message
			const errorType = categorizeConvexError(lastError);
			const errorMessage = getToastErrorMessage(errorType, context, action);
			toast.error(`${errorMessage} (after ${maxRetries} retries)`);

			throw lastError;
		},
		[
			operation,
			maxRetries,
			isRetryableError,
			calculateDelay,
			onRetry,
			onMaxRetriesExceeded,
			context,
			action,
			retryCount,
		]
	);

	const cancel = useCallback(() => {
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			setIsRetrying(false);
			setRetryCount(0);
			toast.dismiss(`retry-${context}-${retryCount}`);
		}
	}, [context, retryCount]);

	return {
		execute: executeWithRetry,
		cancel,
		isRetrying,
		retryCount,
	};
}

/**
 * Wrapper for Convex mutations with built-in retry mechanism
 */
export function useRetryableMutation<T extends unknown[], R>(
	mutation: (...args: T) => Promise<R>,
	options: UseRetryMechanismOptions
) {
	const retryMechanism = useRetryMechanism(mutation, options);

	return {
		mutate: retryMechanism.execute,
		cancel: retryMechanism.cancel,
		isRetrying: retryMechanism.isRetrying,
		retryCount: retryMechanism.retryCount,
	};
}

/**
 * Pre-configured retry options for common scenarios
 */
export const RetryPresets = {
	// Quick operations that should fail fast
	fastOperation: {
		maxRetries: 2,
		baseDelay: 500,
		maxDelay: 2000,
	},

	// Standard operations with moderate retry
	standard: {
		maxRetries: 3,
		baseDelay: 1000,
		maxDelay: 10000,
	},

	// Critical operations that should retry more aggressively
	critical: {
		maxRetries: 5,
		baseDelay: 1000,
		maxDelay: 30000,
	},

	// File upload operations with longer delays
	fileUpload: {
		maxRetries: 3,
		baseDelay: 2000,
		maxDelay: 60000,
		retryableErrors: ['network', 'timeout', 'connection', 'upload'],
	},
} as const;
