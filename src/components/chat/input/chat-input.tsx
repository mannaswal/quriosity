'use client';

import { SendIcon } from 'lucide-react';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from '../../ui/prompt-input';
import { Button } from '../../ui/button';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ModelId } from '@/lib/models';
import { Id } from '../../../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { usePrepareForStream } from '@/hooks/use-messages';
import {
	useCreateThread,
	useThread,
	useThreads,
	useUpdateThreadModel,
} from '@/hooks/use-threads';
import { useCurrentUser, useUpdateLastModelUsed } from '@/hooks/use-user';
import { ModelSelector } from './model-selector';
import { useModel } from '@/hooks/use-model';

export function ChatInput() {
	const router = useRouter();
	const thread = useThread();
	const model = useModel();

	const [message, setMessage] = useState('');

	// Mutation hooks
	const prepareForStreamMutation = usePrepareForStream();
	const createThreadMutation = useCreateThread();
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();

	const handleSendMessage = async (messageContent: string, model: ModelId) => {
		try {
			let targetThreadId: Id<'threads'> | undefined = thread?._id;
			let assistantMessageId: Id<'messages'>;

			if (!targetThreadId) {
				const result = await createThreadMutation({
					messageContent: messageContent,
					model: model,
				});
				targetThreadId = result.threadId;
			}

			// If there is a thread, we can use the existing thread
			assistantMessageId = await prepareForStreamMutation({
				threadId: targetThreadId,
				messageContent: messageContent,
				model: model,
			});

			router.push(`/chat/${targetThreadId}`);

			const streamConfig = await getStreamConfig.mutateAsync({
				threadId: targetThreadId,
				assistantMessageId,
				model: model,
			});

			// Start the streaming request - Convex will handle database updates automatically
			await fetch(streamConfig.streamUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${streamConfig.token}`,
				},
				body: JSON.stringify(streamConfig.payload),
			});
		} catch (error) {
			console.error('Failed to send message or stream response:', error);
			toast.error('Failed to send message');
		}
	};

	const onSendMessage = () => {
		if (!message.trim()) return;
		handleSendMessage(message, model);
		setMessage(''); // Clear input after sending
	};

	return (
		<div className="w-full absolute bottom-2 left-1/2 -translate-x-1/2 max-w-3xl">
			<PromptInput
				onSubmit={onSendMessage}
				onValueChange={setMessage}
				value={message}>
				<PromptInputTextarea
					autoFocus
					spellCheck={false}
					data-ms-editor="false"
					placeholder="Type here..."
					className="md:text-base"
				/>
				<PromptInputActions className="w-full flex items-center justify-between pt-2">
					<PromptInputAction
						delayDuration={300}
						tooltip="Model">
						<ModelSelector />
					</PromptInputAction>
					<PromptInputAction
						delayDuration={300}
						tooltip="Send">
						<Button
							disabled={!model}
							onClick={onSendMessage}
							variant="ghost"
							size="icon"
							className="rounded-lg">
							<SendIcon className="size-4" />
						</Button>
					</PromptInputAction>
				</PromptInputActions>
			</PromptInput>
		</div>
	);
}
