'use client';

import { useEffect, useState, Suspense } from 'react';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import { useConvexAuth, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from 'convex/_generated/api';
import { Loader } from '@/components/ui/loader';
import LoginPrompt from '@/components/home/login-prompt';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/layout/loading';

/**
 * Auth completion page that handles user document creation/verification:
 * - For new users: Creates user document in database
 * - For existing users: Verifies user document exists (no-op if already exists)
 * - Redirects to home page (/) after successful completion
 *
 * Note: ALL users now go through this page via Clerk redirect settings
 * to ensure user documents always exist before accessing the main app
 */
function AuthCompletePageContent() {
	const router = useRouter();
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

				// Store user in database (creates new user or verifies existing user)
				console.log('Ensuring user document exists in database...');
				await storeUser();
				console.log('User document verified/created successfully');

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
		redirect('/auth');
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
	return <Loading />;
}

export default function AuthCompletePage() {
	return (
		<Suspense fallback={<Loading />}>
			<AuthCompletePageContent />
		</Suspense>
	);
}
