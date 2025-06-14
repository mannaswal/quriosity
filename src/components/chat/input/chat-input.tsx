'use client';

import { SendIcon, StopCircleIcon } from 'lucide-react';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useSendMessage } from '@/hooks/use-messages';
import { useStopStream } from '@/hooks/use-threads';
import { ModelSelector } from './model-selector';
import { useThread } from '@/hooks/use-threads';

export function ChatInput() {
	const thread = useThread();
	const [message, setMessage] = useState('');

	const sendMessage = useSendMessage();
	const stopStream = useStopStream();

	const isStreaming = thread?.status === 'streaming';

	const handleStop = async () => {
		try {
			await stopStream(thread?._id);
		} catch (error) {
			console.error('Failed to stop stream:', error);
		}
	};

	const handleSendMessage = async () => {
		if (!message.trim() || isStreaming) return;

		const messageContent = message;
		sendMessage(message).catch((error) => {
			console.error('Failed to send message:', error);
			setMessage(messageContent);
		});
		setMessage('');
	};

	return (
		<div className="w-full absolute bottom-2 left-1/2 -translate-x-1/2 max-w-3xl">
			<PromptInput
				onSubmit={handleSendMessage}
				onValueChange={setMessage}
				value={message}>
				<PromptInputTextarea
					autoFocus
					spellCheck={false}
					data-ms-editor="false"
					placeholder={'Type here...'}
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
								disabled={!message.trim()}
								onClick={handleSendMessage}
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
