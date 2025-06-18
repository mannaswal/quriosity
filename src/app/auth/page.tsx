'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import LoginPrompt from '@/components/home/login-prompt';
import { Loader } from '@/components/ui/loader';

function AuthPageContent() {
	const { isLoaded, isSignedIn } = useUser();
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		// Wait for Clerk to load
		if (!isLoaded) return;

		// If user is already signed in, redirect them
		if (isSignedIn) {
			const redirectTo = searchParams.get('redirectTo') || '/';
			console.log(
				'Auth page - User already signed in, redirecting to:',
				redirectTo
			);
			router.replace(redirectTo);
		}
	}, [isLoaded, isSignedIn, router, searchParams]);

	// Show loading while Clerk is loading
	if (!isLoaded || isSignedIn) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center gap-2 flex items-center">
					<Loader size="lg" />
					<div className="text-muted-foreground">Loading...</div>
				</div>
			</div>
		);
	}

	// Show login prompt if not signed in
	if (!isSignedIn) {
		return <LoginPrompt />;
	}

	// Show loading while redirecting (user is signed in)
	// return (
	// 	<div className="flex items-center justify-center min-h-screen">
	// 		<div className="text-center gap-2 flex items-center">
	// 			<Loader size="lg" />
	// 			<div className="text-muted-foreground">Redirecting...</div>
	// 		</div>
	// 	</div>
	// );
}

export default function AuthPage() {
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
			<AuthPageContent />
		</Suspense>
	);
}
