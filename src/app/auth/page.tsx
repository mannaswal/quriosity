'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import LoginPrompt from '@/components/home/login-prompt';
import { Loading } from '@/components/layout/loading';

function AuthPageContent() {
	const { isLoaded, isSignedIn } = useUser();
	const router = useRouter();

	useEffect(() => {
		// Wait for Clerk to load
		if (!isLoaded) return;

		// If user is already signed in, redirect them
		if (isSignedIn) {
			console.log('Auth page - User already signed in, redirecting to home');
			router.replace('/');
		}
	}, [isLoaded, isSignedIn, router]);

	// Show loading while Clerk is loading
	if (!isLoaded) {
		return <Loading />;
	}

	// Show login prompt if not signed in
	if (!isSignedIn) {
		return <LoginPrompt />;
	}

	// Show loading while redirecting (user is signed in)
	return <Loading message="Redirecting" />;
}

export default function AuthPage() {
	return (
		<Suspense fallback={<Loading />}>
			<AuthPageContent />
		</Suspense>
	);
}
