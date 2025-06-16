'use client';

import {
	PaperclipIcon,
	SendIcon,
	StopCircleIcon,
	UploadIcon,
} from 'lucide-react';
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
import { ModelSelectorAdvanced } from './model-selector-advanced';
import { useThread } from '@/hooks/use-threads';
import { ReasoningSelector } from './reasoning-selector';
import { useTempModel } from '@/stores/use-temp-data-store';
import { canReason, hasAttachments, hasEffortControl } from '@/lib/utils';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import { UploadButton } from '@/utils/uploadthing';

export function ChatInput() {
	const [message, setMessage] = useState('');

	const { scrollToBottom } = useStickToBottomContext();
	const thread = useThread();

	const sendMessage = useSendMessage();
	const stopStream = useStopStream();
	const modelId = useTempModel();

	const isProcessing =
		thread?.status === 'streaming' || thread?.status === 'pending';

	const handleStop = async () => {
		stopStream(thread?._id).catch((error) => {
			console.error('Failed to stop stream:', error);
		});
	};

	const handleSendMessage = async () => {
		if (!message.trim() || isProcessing) return;
		scrollToBottom();

		const messageContent = message;
		sendMessage(message).catch((error) => {
			console.error('Failed to send message:', error);
			setMessage(messageContent);
		});
		setMessage('');
	};

	return (
		<div className="w-full absolute left-1/2 -translate-x-[calc(50%+0.5rem)] max-w-3xl z-50 bottom-2 mx-2">
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
					<div className="flex items-center gap-0">
						<PromptInputAction
							delayDuration={300}
							tooltip="Model">
							<ModelSelectorAdvanced />
						</PromptInputAction>
						{hasEffortControl(modelId) && (
							<PromptInputAction
								delayDuration={300}
								tooltip="Reasoning">
								<ReasoningSelector />
							</PromptInputAction>
						)}
						{hasAttachments(modelId) && (
							<PromptInputAction
								delayDuration={300}
								tooltip="Attachments">
								<Button
									variant="ghost"
									size="icon"
									asChild>
									<UploadButton
										content={{
											button: <PaperclipIcon className="size-4 stroke-[1.5]" />,
										}}
										appearance={{
											allowedContent: 'hidden',
										}}
										config={{
											appendOnPaste: true,
										}}
										endpoint="fileUploader"
										onClientUploadComplete={(res) => {
											console.log('res', res);
										}}
										onUploadError={(error: Error) => {
											console.log('error', error);
										}}
									/>
								</Button>
							</PromptInputAction>
						)}
					</div>
					<PromptInputAction
						delayDuration={300}
						tooltip={isProcessing ? 'Stop' : 'Send'}>
						{isProcessing ? (
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
