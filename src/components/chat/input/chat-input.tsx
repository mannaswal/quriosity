'use client';

import { SendIcon, StopCircleIcon } from 'lucide-react';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from '../../ui/prompt-input';
import { Button } from '../../ui/button';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ModelId } from '@/lib/models';
import { Id } from '../../../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { usePrepareForStream } from '@/hooks/use-messages';
import { useCreateThread, useThreadId, useThread } from '@/hooks/use-threads';
import { useStopStream } from '@/hooks/use-threads';
import { ModelSelector } from './model-selector';
import { useModel } from '@/hooks/use-model';

export function ChatInput() {
	const model = useModel();
	const router = useRouter();
	const threadId = useThreadId();
	const thread = useThread();

	const createThreadMutation = useCreateThread();
	const prepareForStreamMutation = usePrepareForStream();
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();
	const stopStream = useStopStream();

	const [message, setMessage] = useState('');
	const abortControllerRef = useRef<AbortController | null>(null);

	const isStreaming = thread?.isStreaming || false;

	const handleSendMessage = async (messageContent: string, model: ModelId) => {
		try {
			let targetThreadId = threadId;
			let assistantMessageId: Id<'messages'>;

			if (!targetThreadId) {
				// If there is no thread, we create a new one
				const { threadId: newThreadId } = await createThreadMutation({
					messageContent: messageContent,
					model: model,
				});
				targetThreadId = newThreadId;
			}

			// Sure that a thread exists, we prepare for streaming
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

			// Create new AbortController for this request
			abortControllerRef.current = new AbortController();

			// Start the streaming request - Convex will handle database updates automatically
			await fetch(streamConfig.streamUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${streamConfig.token}`,
				},
				body: JSON.stringify(streamConfig.payload),
				signal: abortControllerRef.current.signal,
			});
		} catch (error) {
			// Check if error was due to abort
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Stream request was aborted');
				return;
			}
			console.error('Failed to send message or stream response:', error);
			toast.error('Failed to send message');
		} finally {
			abortControllerRef.current = null;
		}
	};

	const handleStop = async () => {
		if (!threadId) return;

		try {
			// Abort the fetch request immediately
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			// Stop the stream via database
			await stopStream(threadId);
		} catch (error) {
			console.error('Failed to stop stream:', error);
		}
	};

	const onSendMessage = () => {
		if (!message.trim() || isStreaming) return;
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
					placeholder={isStreaming ? 'Generating response...' : 'Type here...'}
					className="md:text-base"
					disabled={isStreaming}
				/>
				<PromptInputActions className="w-full flex items-center justify-between pt-2">
					<PromptInputAction
						delayDuration={300}
						tooltip="Model">
						<ModelSelector />
					</PromptInputAction>
					<PromptInputAction
						delayDuration={300}
						tooltip={isStreaming ? 'Stop' : 'Send'}>
						{isStreaming ? (
							<Button
								onClick={handleStop}
								variant="ghost"
								size="icon"
								className="rounded-lg">
								<StopCircleIcon className="size-4" />
							</Button>
						) : (
							<Button
								disabled={!model || !message.trim()}
								onClick={onSendMessage}
								variant="ghost"
								size="icon"
								className="rounded-lg">
								<SendIcon className="size-4" />
							</Button>
						)}
					</PromptInputAction>
				</PromptInputActions>
			</PromptInput>
		</div>
	);
}
