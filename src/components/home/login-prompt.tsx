import { SignInButton } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Funnel_Display } from 'next/font/google';
import { ArrowRightIcon } from 'lucide-react';

const funnelDisplay = Funnel_Display({
	subsets: ['latin'],
	weight: ['400'],
});

export default function LoginPrompt() {
	return (
		<main className="w-full h-dvh flex flex-col items-center justify-center">
			<h1
				className={cn(
					'text-4xl sm:text-8xl font-medium mb-8 -mt-8',
					funnelDisplay.className
				)}>
				Quriosity
			</h1>
			<SignInButton>
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
