'use client';

import { ChatInput } from '@/components/chat-input';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
	const router = useRouter();
	const [message, setMessage] = useState('');
	const [model, setModel] = useState('google/gemini-2.0-flash-001');

	// Get the special mutation that creates a thread AND the first message
	const createThreadAndSendMessage = useMutation(
		api.threads.createThreadAndSendMessage
	);

	const handleSendMessage = async () => {
		if (!message) return;

		try {
			// 1. Call the mutation. It will return the new thread's ID.
			const threadId = await createThreadAndSendMessage({
				messageContent: message,
				model: model, // Your default model
			});

			// 2. Use the returned ID to navigate to the new chat page.
			router.push(`/chat/${threadId}`);
		} catch (error) {
			console.error('Failed to create new thread:', error);
			// Optionally, show an error toast to the user
		}
	};

	return (
		<div className="mx-auto w-3xl h-screen max-h-screen relative">
			<ChatInput
				message={message}
				model={model}
				handleMessageChange={setMessage}
				handleModelChange={setModel}
				handleSendMessage={handleSendMessage}
			/>
		</div>
	);
}
