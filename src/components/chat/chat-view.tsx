import ChatContainer from '@/components/chat/chat-container';
import { ProgressiveBlur } from '../ui/progressive-blur';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { getAuthToken } from '@/server/clerk';
import { fetchQuery, preloadQuery } from 'convex/nextjs';

/**
 * Server component that preloads the thread, messages, and user.
 */
export async function ChatView({
	threadId,
}: {
	threadId: Id<'threads'> | undefined;
}) {
	const token = await getAuthToken();

	const serverMessages = token
		? await fetchQuery(
				api.messages.getMessagesByThread,
				{
					threadId,
				},
				{
					token,
				}
		  )
		: [];
	const serverThread =
		(token
			? await fetchQuery(
					api.threads.getThreadById,
					{
						threadId,
					},
					{
						token,
					}
			  )
			: undefined) ?? undefined;
	const serverUser =
		(token
			? await fetchQuery(api.users.getCurrentUser, {}, { token })
			: undefined) ?? undefined;

	return (
		<div className="w-full h-screen max-h-screen relative">
			<ProgressiveBlur
				className="pointer-events-none absolute top-0 left-0 h-14 w-full z-10"
				blurIntensity={0.4}
				blurLayers={12}
				direction="top"
			/>
			<div className="absolute top-0 left-0 h-16 w-full bg-gradient-to-t from-transparent to-background/95" />
			<ChatContainer
				serverMessages={serverMessages}
				serverThread={serverThread}
				serverUser={serverUser}
			/>
		</div>
	);
}
