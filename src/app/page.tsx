import { ChatView } from '@/components/chat/chat-view';
import LoginPrompt from '@/components/home/login-prompt';
import { currentUser } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';

export default async function Home() {
	const { userId } = await auth();
	const user = await currentUser();

	if (!userId) {
		return <LoginPrompt />;
	}

	return <ChatView />;
}
