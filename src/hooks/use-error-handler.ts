'use client';

import { useCallback } from 'react';
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

interface UseErrorHandlerOptions {
	context: ErrorContext;
	action?: string;
	showToast?: boolean;
	onError?: (error: Error) => void;
}

/**
 * Custom hook for handling Convex errors consistently across the application
 * Provides automatic error categorization, toast messages, and redirects
 */
export function useErrorHandler(options: UseErrorHandlerOptions) {
	const router = useRouter();
	const { context, action, showToast = true, onError } = options;

	const handleError = useCallback(
		(error: Error) => {
			const errorType = categorizeConvexError(error);
			const redirectPath = getErrorRedirectPath(errorType, context);

			// Show toast message
			if (showToast) {
				const toastMessage = getToastErrorMessage(errorType, context, action);
				toast.error(toastMessage);
			}

			// Handle redirects
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
				console.error(`[${context}] Error:`, error);
			}

			return errorType;
		},
		[context, action, showToast, router, onError]
	);

	return { handleError };
}
