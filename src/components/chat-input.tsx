import { SendIcon } from 'lucide-react';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from './ui/prompt-input';
import { Button } from './ui/button';

export function ChatInput() {
	return (
		<div className="w-full absolute bottom-2">
			<PromptInput>
				<PromptInputTextarea />
				<PromptInputActions className="justify-end pt-2">
					<PromptInputAction
						delayDuration={300}
						tooltip="Send">
						<Button
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
