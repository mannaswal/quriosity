'use client';

import { SendIcon } from 'lucide-react';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from './ui/prompt-input';
import { Button } from './ui/button';
import { useState } from 'react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select';

export function ChatInput({
	model,
	handleModelChange,
	handleSendMessage,
}: {
	model: string;
	handleModelChange: (model: string) => void;
	handleSendMessage: (message: string) => void;
}) {
	const [message, setMessage] = useState('');

	const onSendMessage = () => {
		if (!message.trim()) return;

		handleSendMessage(message);
		setMessage(''); // Clear input after sending
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter') {
			onSendMessage();
		}
	};

	return (
		<div className="w-full absolute bottom-2 left-1/2 -translate-x-1/2 max-w-3xl">
			<PromptInput>
				<PromptInputTextarea
					value={message}
					placeholder="Type here..."
					className="md:text-base"
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
				<PromptInputActions className="w-full flex items-center justify-between pt-2">
					<PromptInputAction
						delayDuration={300}
						tooltip="Model">
						<Select
							value={model}
							onValueChange={(value) => handleModelChange(value)}>
							<SelectTrigger className="border-none not-hover:dark:bg-transparent">
								<SelectValue placeholder="Select a model" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="google/gemini-2.0-flash-001">
									Gemini 2.0 Flash
								</SelectItem>
								<SelectItem value="google/gemini-2.5-flash-preview-05-20">
									Gemini 2.5 Flash
								</SelectItem>
								<SelectItem value="openai/gpt-4.1-nano">
									GPT-4.1 Nano
								</SelectItem>
							</SelectContent>
						</Select>
					</PromptInputAction>
					<PromptInputAction
						delayDuration={300}
						tooltip="Send">
						<Button
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
