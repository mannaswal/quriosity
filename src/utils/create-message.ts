import { ModelId } from '@/lib/models';
import { Id } from '../../convex/_generated/dataModel';
import { ConvexClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@clerk/nextjs';

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
	throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
}
const convexClient = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * Create a new message in the thread
 * @param threadId - The ID of the thread
 * @param messageContent - The content of the message
 * @param model - The model to use for the message
 * @returns The ID of the new message
 */
export const createMessage = async (
	threadId: Id<'threads'>,
	messageContent: string,
	model: ModelId
) => {
	if (!convexClient) throw new Error('Convex client not initialized');

	// const { getToken } = auth;
	// convex.setAuth(() => getToken());

	const threadMessages = await convexClient.query(api.messages.listByThread, {
		threadId,
	});

	return;
};
