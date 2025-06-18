'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConvexAuth, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from 'convex/_generated/api';
import { Loader } from '@/components/ui/loader';
import LoginPrompt from '@/components/home/login-prompt';

/**
 * Auth completion page for first-time users (sign-ups) that handles:
 * - Storing new user in database
 * - Redirecting to intended destination
 * Note: Returning users (sign-ins) skip this page and go directly to their destination
 */
function AuthCompletePageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isLoading: isConvexLoading, isAuthenticated } = useConvexAuth();
	const { isLoaded: isClerkLoaded, user } = useUser();
	const [isProcessing, setIsProcessing] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const storeUser = useMutation(api.users.storeUser);

	useEffect(() => {
		async function handleAuth() {
			try {
				// Wait for both Clerk and Convex to be ready
				if (!isClerkLoaded || isConvexLoading) {
					return;
				}

				// If user is not authenticated with Clerk, show login prompt
				if (!user) {
					setIsProcessing(false);
					return;
				}

				// If Convex is not authenticated, wait a bit more
				if (!isAuthenticated) {
					// Give it a moment for the token to propagate
					setTimeout(() => {
						if (!isAuthenticated) {
							setError('Authentication failed. Please try signing in again.');
							setIsProcessing(false);
						}
					}, 2000);
					return;
				}

				// Store new user in database (this page is only for sign-ups)
				console.log('Storing new user in database...');
				await storeUser();
				console.log('New user stored successfully');

				// Get redirect destination
				const redirectTo = searchParams.get('redirectTo') || '/';

				// Redirect to destination
				console.log('Auth completed, redirecting to:', redirectTo);
				router.replace(redirectTo);
			} catch (err) {
				console.error('Auth completion error:', err);
				setError('Failed to complete authentication. Please try again.');
				setIsProcessing(false);
			}
		}

		handleAuth();
	}, [
		isClerkLoaded,
		isConvexLoading,
		isAuthenticated,
		user,
		storeUser,
		router,
		searchParams,
	]);

	// Show login prompt if not authenticated
	if (!isProcessing && !user) {
		return <LoginPrompt />;
	}

	// Show error state
	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center gap-2 flex items-center">
					<div className="text-red-500">{error}</div>
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
						Try Again
					</button>
				</div>
			</div>
		);
	}

	// Show loading state
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center gap-2 flex items-center">
				<Loader size="lg" />
				<div className="text-muted-foreground">Setting up your account...</div>
			</div>
		</div>
	);
}

export default function AuthCompletePage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-center gap-2 flex items-center">
						<Loader size="lg" />
						<div className="text-muted-foreground">Loading...</div>
					</div>
				</div>
			}>
			<AuthCompletePageContent />
		</Suspense>
	);
}
