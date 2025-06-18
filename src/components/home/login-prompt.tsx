'use client';

import { SignInButton } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Funnel_Display } from 'next/font/google';
import { ArrowRightIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const funnelDisplay = Funnel_Display({
	subsets: ['latin'],
	weight: ['400'],
});

function LoginPromptContent() {
	const searchParams = useSearchParams();
	const redirectTo = searchParams.get('redirectTo') || '/';

	// For sign-in (returning users): go directly to intended destination
	const signInRedirectUrl = redirectTo;

	// For sign-up (first-time users): go to auth completion to store user in DB
	const signUpRedirectUrl = `/auth/complete?redirectTo=${encodeURIComponent(
		redirectTo
	)}`;

	return (
		<main className="w-full h-dvh flex flex-col items-center justify-center">
			<h1
				className={cn(
					'text-4xl sm:text-8xl font-medium mb-8 -mt-8',
					funnelDisplay.className
				)}>
				Quriosity
			</h1>
			<SignInButton
				fallbackRedirectUrl={signInRedirectUrl}
				signUpForceRedirectUrl={signUpRedirectUrl}
				signUpFallbackRedirectUrl={signUpRedirectUrl}>
				<Button
					size="lg"
					className="rounded-lg w-48">
					Get started{' '}
					<ArrowRightIcon className="size-4 text-primary-foreground" />
				</Button>
			</SignInButton>
		</main>
	);
}

export default function LoginPrompt() {
	return (
		<Suspense
			fallback={
				<main className="w-full h-dvh flex flex-col items-center justify-center">
					<h1
						className={cn(
							'text-4xl sm:text-8xl font-medium mb-8 -mt-8',
							funnelDisplay.className
						)}>
						Quriosity
					</h1>
					<div className="text-muted-foreground">Loading...</div>
				</main>
			}>
			<LoginPromptContent />
		</Suspense>
	);
}
