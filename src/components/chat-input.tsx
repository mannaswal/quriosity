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

export function ChatInput() {
	const [model, setModel] = useState('gemini-2.5-flash');
	const [message, setMessage] = useState('');

	return (
		<div className="w-full absolute bottom-2">
			<PromptInput>
				<PromptInputTextarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
				/>
				<PromptInputActions className="w-full flex items-center justify-between pt-2">
					<PromptInputAction
						delayDuration={300}
						tooltip="Model">
						<Select
							value={model}
							onValueChange={(value) => setModel(value)}>
							<SelectTrigger className="border-none not-hover:dark:bg-transparent">
								<SelectValue placeholder="Select a model" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="gemini-2.5-flash">
									Gemini 2.5 Flash
								</SelectItem>
							</SelectContent>
						</Select>
					</PromptInputAction>
					<PromptInputAction
						delayDuration={300}
						tooltip="Send">
						<Button
							variant="ghost"
							size="icon"
							className="rounded-lg justify-end ">
							<SendIcon className="size-4" />
						</Button>
					</PromptInputAction>
				</PromptInputActions>
			</PromptInput>
		</div>
	);
}
