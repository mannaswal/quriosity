import ChatContainer from '@/components/chat-container';
import { ChatInput } from '@/components/chat-input';
import { auth0 } from '@/lib/auth0';

export default async function Home() {
	return (
		<div className="mx-auto w-3xl h-screen max-h-screen relative">
			<ChatContainer />
			<ChatInput />
		</div>
	);
}
