'use client';

import { ChatView } from '@/components/chat/chat-view';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export default function Home() {
	const { isLoaded, isSignedIn } = useUser();
	const router = useRouter();

	useEffect(() => {
		// If Clerk has loaded and user is not signed in, redirect to auth
		if (isLoaded && !isSignedIn) {
			console.log('Home page - User not signed in, redirecting to auth');
			router.replace('/auth');
		}
	}, [isLoaded, isSignedIn, router]);

	// Show loading while checking auth
	if (!isLoaded) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center gap-2 flex items-center">
					<Loader size="lg" />
					<div className="text-muted-foreground">Loading...</div>
				</div>
			</div>
		);
	}

	// If not signed in, show loading while redirecting
	if (!isSignedIn) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center gap-2 flex items-center">
					<Loader size="lg" />
					<div className="text-muted-foreground">Redirecting to login...</div>
				</div>
			</div>
		);
	}

	// User is authenticated, show the chat
	return <ChatView />;
}
