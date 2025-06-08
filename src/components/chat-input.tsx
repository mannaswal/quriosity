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
	message,
	model,
	handleMessageChange,
	handleModelChange,
	handleSendMessage,
}: {
	message: string;
	model: string;
	handleMessageChange: (message: string) => void;
	handleModelChange: (model: string) => void;
	handleSendMessage: () => void;
}) {
	return (
		<div className="w-full absolute bottom-2">
			<PromptInput>
				<PromptInputTextarea
					value={message}
					className="text-lg"
					onChange={(e) => handleMessageChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
							handleSendMessage();
						}
					}}
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
							onClick={handleSendMessage}
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
