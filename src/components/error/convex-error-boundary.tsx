'use client';

import React, { Component, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import {
	categorizeConvexError,
	getErrorRedirectPath,
	getErrorTitle,
	getErrorMessage,
	shouldRedirectOnError,
	getRedirectDelay,
	type ErrorContext,
	type ConvexErrorType,
} from '@/lib/error-handling';

interface ConvexErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorType: ConvexErrorType | null;
}

interface ConvexErrorBoundaryProps {
	children: ReactNode;
	context: ErrorContext;
	fallback?: React.ComponentType<ConvexErrorFallbackProps>;
	onError?: (error: Error, errorType: ConvexErrorType) => void;
	showRetry?: boolean;
}

interface ConvexErrorFallbackProps {
	error: Error;
	errorType: ConvexErrorType;
	context: ErrorContext;
	retry: () => void;
	goHome: () => void;
}

/**
 * Error fallback component with redirect functionality
 */
function ConvexErrorFallback({
	error,
	errorType,
	context,
	retry,
	goHome,
}: ConvexErrorFallbackProps) {
	const router = useRouter();
	const [countdown, setCountdown] = React.useState<number | null>(null);

	const redirectPath = getErrorRedirectPath(errorType, context);
	const shouldRedirect = shouldRedirectOnError(errorType) && redirectPath;
	const redirectDelay = getRedirectDelay(errorType);

	useEffect(() => {
		if (shouldRedirect && redirectPath) {
			if (redirectDelay > 0) {
				// Show countdown
				const delaySeconds = Math.ceil(redirectDelay / 1000);
				setCountdown(delaySeconds);

				const countdownInterval = setInterval(() => {
					setCountdown((prev) => {
						if (prev === null || prev <= 1) {
							clearInterval(countdownInterval);
							router.push(redirectPath);
							return null;
						}
						return prev - 1;
					});
				}, 1000);

				return () => clearInterval(countdownInterval);
			} else {
				// Immediate redirect
				router.push(redirectPath);
			}
		}
	}, [shouldRedirect, redirectPath, redirectDelay, router]);

	const title = getErrorTitle(errorType, context);
	const message = getErrorMessage(errorType, context);

	return (
		<div className="flex items-center justify-center min-h-[400px] p-8">
			<div className="max-w-md w-full">
				<Alert
					variant="destructive"
					className="mb-4">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{title}</AlertTitle>
					<AlertDescription className="mt-2">{message}</AlertDescription>
				</Alert>

				<div className="flex flex-col gap-3">
					{!shouldRedirect && (
						<Button
							onClick={retry}
							variant="outline"
							className="w-full"
							size="sm">
							<RefreshCw className="h-4 w-4 mr-2" />
							Try Again
						</Button>
					)}

					<Button
						onClick={goHome}
						variant="outline"
						className="w-full"
						size="sm">
						<Home className="h-4 w-4 mr-2" />
						Go Home
					</Button>

					{countdown !== null && redirectPath && (
						<p className="text-sm text-muted-foreground text-center">
							Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
						</p>
					)}
				</div>

				{process.env.NODE_ENV === 'development' && (
					<details className="mt-4">
						<summary className="text-sm text-muted-foreground cursor-pointer">
							Error Details (Development)
						</summary>
						<pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
							{error.message}
							{error.stack && '\n' + error.stack}
						</pre>
					</details>
				)}
			</div>
		</div>
	);
}

/**
 * Enhanced error boundary for Convex operations
 * Provides context-aware error handling with automatic redirects
 */
export class ConvexErrorBoundary extends Component<
	ConvexErrorBoundaryProps,
	ConvexErrorBoundaryState
> {
	constructor(props: ConvexErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorType: null,
		};
	}

	static getDerivedStateFromError(error: Error): ConvexErrorBoundaryState {
		const errorType = categorizeConvexError(error);
		return {
			hasError: true,
			error,
			errorType,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('ConvexErrorBoundary caught error:', error, errorInfo);

		if (this.state.errorType) {
			this.props.onError?.(error, this.state.errorType);
		}
	}

	retry = () => {
		this.setState({
			hasError: false,
			error: null,
			errorType: null,
		});
	};

	goHome = () => {
		window.location.href = '/';
	};

	render() {
		if (this.state.hasError && this.state.error && this.state.errorType) {
			const FallbackComponent = this.props.fallback || ConvexErrorFallback;

			return (
				<FallbackComponent
					error={this.state.error}
					errorType={this.state.errorType}
					context={this.props.context}
					retry={this.retry}
					goHome={this.goHome}
				/>
			);
		}

		return this.props.children;
	}
}

/**
 * Hook-based wrapper for functional components
 */
export function useConvexErrorBoundary() {
	const router = useRouter();

	const handleError = React.useCallback(
		(error: Error, context: ErrorContext) => {
			const errorType = categorizeConvexError(error);
			const redirectPath = getErrorRedirectPath(errorType, context);

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

			return errorType;
		},
		[router]
	);

	return { handleError };
}
