import { Suspense } from 'react';
import { PublicChatView } from '@/components/chat/public/public-chat-view';
import { fetchQuery } from 'convex/nextjs';
import { api } from 'convex/_generated/api';
import { Loading } from '@/components/layout/loading';

/**
 * Public share page for threads
 * This page is unauthed and shows a read-only version of the chat
 */
export default async function SharePage({
	params,
}: {
	params: Promise<{ shareId: string }>;
}) {
	const { shareId } = await params;
	return (
		<div className="min-h-screen bg-background">
			<Suspense fallback={<Loading />}>
				<PublicChatView shareId={shareId} />
			</Suspense>
		</div>
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ shareId: string }>;
}) {
	const { shareId } = await params;

	const thread = await fetchQuery(api.threads.getPublicThreadByShareId, {
		shareId,
	});

	if (!thread) {
		return {
			title: 'Thread not found',
			description: 'The thread you are looking for does not exist',
		};
	}

	return {
		title: thread.title,
		description: 'Shared chat from Quriosity',
	};
}
