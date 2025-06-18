'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useThread } from '@/hooks/use-threads';
import { toast } from 'sonner';

export function ThreadGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const thread = useThread();

	// Handle thread deletion detection - only runs on thread pages
	useEffect(() => {
		if (thread === null) {
			// Thread was deleted (query returned null, not undefined which means loading)
			toast.error('This conversation has been deleted');
			router.push('/');
		}
	}, [thread, router]);

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

	return <>{children}</>;
}
