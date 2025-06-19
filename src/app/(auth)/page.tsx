'use client';

import { ChatView } from '@/components/chat/chat-view';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loading } from '@/components/layout/loading';

export default function Home() {
	const { isLoaded, isSignedIn } = useUser();
	const router = useRouter();

	useEffect(() => {
		// If Clerk has loaded and user is not signed in, redirect to auth
		if (isLoaded && !isSignedIn) {
			console.log('Home page - User not signed in, redirecting to auth');
			router.replace('/auth/complete');
		}
	}, [isLoaded, isSignedIn, router]);

	// Show loading while checking auth
	if (!isLoaded) {
		return <Loading />;
	}

	// If not signed in, show loading while redirecting
	if (!isSignedIn) {
		return <Loading message="Redirecting to login..." />;
	}

	// User is authenticated, show the chat
	return <ChatView />;
}
