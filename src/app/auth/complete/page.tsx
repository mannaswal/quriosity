'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConvexAuth, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from 'convex/_generated/api';
import { Loader } from '@/components/ui/loader';
import LoginPrompt from '@/components/home/login-prompt';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/layout/loading';

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

				// Redirect to home page
				console.log('Auth completed, redirecting to home');
				router.replace('/');
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
	]);

	// Show login prompt if not authenticated
	if (!isProcessing && !user) {
		return <LoginPrompt />;
	}

	// Show error state
	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center gap-2 flex flex-col items-center">
					<div className="text-rose-500">{error}</div>
					<Button onClick={() => window.location.reload()}>Try Again</Button>
				</div>
			</div>
		);
	}

	// Show loading state
	return <Loading message="Setting up your account..." />;
}

export default function AuthCompletePage() {
	return (
		<Suspense fallback={<Loading />}>
			<AuthCompletePageContent />
		</Suspense>
	);
}
