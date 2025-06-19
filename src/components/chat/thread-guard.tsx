'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useThread } from '@/hooks/use-threads';
import { toast } from 'sonner';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { ConvexErrorBoundary } from '@/components/error/convex-error-boundary';

export function ThreadGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const thread = useThread();
	const [errorHandled, setErrorHandled] = useState(false);
	const { handleError } = useErrorHandler({
		context: 'thread',
		showToast: false, // We'll handle toasts manually for better messaging
	});

	// Handle thread deletion detection - only runs on thread pages
	useEffect(() => {
		if (thread === null && !errorHandled) {
			// Thread was deleted or not found (query returned null, not undefined which means loading)
			toast.error('This conversation has been deleted or does not exist');
			router.push('/');
			setErrorHandled(true);
		}
	}, [thread, router, errorHandled]);

	// Reset error state when thread changes
	useEffect(() => {
		setErrorHandled(false);
	}, [thread?._id]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.shiftKey &&
				e.key.toLowerCase() === 'o'
			) {
				e.preventDefault();
				router.push('/');
			}
		};
		window.addEventListener('keydown', handler);
		return () => {
			window.removeEventListener('keydown', handler);
		};
	}, [router]);

	return (
		<ConvexErrorBoundary
			context="thread"
			onError={(error, errorType) => {
				console.error('Thread error caught by boundary:', error, errorType);
			}}>
			{children}
		</ConvexErrorBoundary>
	);
}
