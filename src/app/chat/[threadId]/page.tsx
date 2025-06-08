'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { use, useState } from 'react';
import ChatContainer from '@/components/chat-container';
import { ChatInput } from '@/components/chat-input';

export default function ChatPage({
	params,
}: {
	params: Promise<{ threadId: Id<'threads'> }>;
}) {
	const { threadId } = use(params);

	const [newMessage, setNewMessage] = useState('');
	const [model, setModel] = useState('google/gemini-2.0-flash-001');

	// THIS IS THE SUBSCRIPTION!
	// It fetches all messages for this specific thread and will
	// automatically update when new messages are added or changed.
	const messages = useQuery(api.messages.listByThread, { threadId }) ?? [];

	// Use the mutation for sending subsequent messages
	const sendMessage = useMutation(api.messages.createAndStream);

	const handleSendMessage = async () => {
		if (!newMessage) return;

		// Call the mutation with the existing threadId
		await sendMessage({
			threadId: threadId,
			messageContent: newMessage,
			model: model, // Or a model selected in the UI
		});

		setNewMessage('');
	};

	return (
		<div className="mx-auto w-3xl h-screen max-h-screen relative">
			<ChatContainer messages={messages} />
			<ChatInput
				message={newMessage}
				model={model}
				handleMessageChange={setNewMessage}
				handleModelChange={setModel}
				handleSendMessage={handleSendMessage}
			/>
		</div>
	);
}
