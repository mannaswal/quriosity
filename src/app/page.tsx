import { ChatInput } from '@/components/chat-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendIcon } from 'lucide-react';

export default function Home() {
	return (
		<div className="mx-auto w-3xl h-screen max-h-screen relative">
			<div className="flex-1"></div>

			<ChatInput />
		</div>
	);
}
