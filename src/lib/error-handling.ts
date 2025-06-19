/**
 * Error handling utilities for Convex operations
 * Provides consistent error categorization and handling across the application
 */

export type ConvexErrorType =
	| 'not-authenticated'
	| 'unauthorized'
	| 'not-found'
	| 'validation-error'
	| 'network-error'
	| 'unknown';

export type ErrorContext =
	| 'thread'
	| 'project'
	| 'message'
	| 'attachment'
	| 'user';

/**
 * Categorizes Convex errors based on error message content
 */
export function categorizeConvexError(error: Error): ConvexErrorType {
	const message = error.message.toLowerCase();

	// Authentication errors
	if (
		message.includes('not authenticated') ||
		message.includes('user not authenticated')
	) {
		return 'not-authenticated';
	}

	// User document creation issues - these should now be extremely rare
	// since all users will go through /auth/complete first
	if (
		message.includes('user not found') ||
		message.includes('user document not found') ||
		message.includes('no user document')
	) {
		// Treat as unauthorized since this shouldn't happen with proper auth flow
		return 'unauthorized';
	}

	// Authorization errors
	if (
		message.includes('unauthorized') ||
		message.includes('not authorized') ||
		message.includes('you can only access your own') ||
		message.includes('user not authorized')
	) {
		return 'unauthorized';
	}

	// Not found errors
	if (message.includes('not found') || message.includes('does not exist')) {
		return 'not-found';
	}

	// Validation errors
	if (
		message.includes('validation') ||
		message.includes('invalid') ||
		message.includes('cannot be empty') ||
		message.includes('cannot exceed')
	) {
		return 'validation-error';
	}

	// Network/connection errors
	if (
		message.includes('network') ||
		message.includes('fetch') ||
		message.includes('connection') ||
		message.includes('timeout')
	) {
		return 'network-error';
	}

	return 'unknown';
}

/**
 * Gets the appropriate redirect path based on error type and context
 */
export function getErrorRedirectPath(
	errorType: ConvexErrorType,
	context: ErrorContext
): string | null {
	switch (errorType) {
		case 'not-authenticated':
			return '/auth';

		case 'unauthorized':
			// Redirect to appropriate parent route
			switch (context) {
				case 'project':
					return '/projects';
				case 'thread':
				case 'message':
					return '/';
				case 'attachment':
					return '/';
				default:
					return '/';
			}

		case 'not-found':
			// Similar logic to unauthorized
			switch (context) {
				case 'project':
					return '/projects';
				case 'thread':
				case 'message':
					return '/';
				case 'attachment':
					return '/';
				default:
					return '/';
			}

		case 'validation-error':
		case 'network-error':
		case 'unknown':
		default:
			return null; // Don't redirect for these errors
	}
}

/**
 * Gets user-friendly error titles based on error type and context
 */
export function getErrorTitle(
	errorType: ConvexErrorType,
	context: ErrorContext
): string {
	switch (errorType) {
		case 'not-authenticated':
			return 'Authentication Required';

		case 'unauthorized':
			switch (context) {
				case 'project':
					return 'Project Access Denied';
				case 'thread':
					return 'Conversation Access Denied';
				case 'message':
					return 'Message Access Denied';
				case 'attachment':
					return 'File Access Denied';
				default:
					return 'Access Denied';
			}

		case 'not-found':
			switch (context) {
				case 'project':
					return 'Project Not Found';
				case 'thread':
					return 'Conversation Not Found';
				case 'message':
					return 'Message Not Found';
				case 'attachment':
					return 'File Not Found';
				default:
					return 'Resource Not Found';
			}

		case 'validation-error':
			return 'Invalid Input';

		case 'network-error':
			return 'Connection Error';

		case 'unknown':
		default:
			return 'Something Went Wrong';
	}
}

/**
 * Gets user-friendly error messages based on error type and context
 */
export function getErrorMessage(
	errorType: ConvexErrorType,
	context: ErrorContext
): string {
	switch (errorType) {
		case 'not-authenticated':
			return 'Please sign in to continue using the application.';

		case 'unauthorized':
			switch (context) {
				case 'project':
					return "You don't have permission to access this project.";
				case 'thread':
					return "You don't have permission to access this conversation.";
				case 'message':
					return "You don't have permission to access this message.";
				case 'attachment':
					return "You don't have permission to access this file.";
				default:
					return "You don't have permission to access this resource.";
			}

		case 'not-found':
			switch (context) {
				case 'project':
					return 'This project no longer exists or has been deleted.';
				case 'thread':
					return 'This conversation no longer exists or has been deleted.';
				case 'message':
					return 'This message no longer exists or has been deleted.';
				case 'attachment':
					return 'This file no longer exists or has been deleted.';
				default:
					return 'The requested resource could not be found.';
			}

		case 'validation-error':
			return 'Please check your input and try again.';

		case 'network-error':
			return 'Please check your internet connection and try again.';

		case 'unknown':
		default:
			return 'An unexpected error occurred. Please try again.';
	}
}

/**
 * Get toast-friendly error messages (shorter, more actionable)
 */
export function getToastErrorMessage(
	errorType: ConvexErrorType,
	context: ErrorContext,
	action?: string
): string {
	const actionText = action ? ` ${action}` : '';

	switch (errorType) {
		case 'not-authenticated':
			return 'Please sign in to continue';

		case 'unauthorized':
			switch (context) {
				case 'project':
					return `You don't have permission to${actionText} this project`;
				case 'thread':
					return `You don't have permission to${actionText} this conversation`;
				case 'message':
					return `You don't have permission to${actionText} this message`;
				case 'attachment':
					return `You don't have permission to${actionText} this file`;
				default:
					return `You don't have permission to${actionText}`;
			}

		case 'not-found':
			switch (context) {
				case 'project':
					return 'Project not found';
				case 'thread':
					return 'Conversation not found';
				case 'message':
					return 'Message not found';
				case 'attachment':
					return 'File not found';
				default:
					return 'Resource not found';
			}

		case 'validation-error':
			return action ? `Invalid ${action} input` : 'Please check your input';

		case 'network-error':
			return action
				? `Failed to ${action} - check your connection`
				: 'Connection error';

		case 'unknown':
		default:
			return action ? `Failed to ${action}` : 'Something went wrong';
	}
}

/**
 * Determines if an error should trigger an automatic redirect
 */
export function shouldRedirectOnError(errorType: ConvexErrorType): boolean {
	return ['not-authenticated', 'unauthorized', 'not-found'].includes(errorType);
}

/**
 * Gets the delay (in milliseconds) before redirecting for different error types
 */
export function getRedirectDelay(errorType: ConvexErrorType): number {
	switch (errorType) {
		case 'not-authenticated':
			return 1000; // Quick redirect for auth issues
		case 'unauthorized':
		case 'not-found':
			return 3000; // Give user time to read the message
		default:
			return 2000;
	}
}
