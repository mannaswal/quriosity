'use client';

import { FileIcon, SendIcon, StopCircleIcon } from 'lucide-react';
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
import { ModelSelectorAdvanced } from './model-selector-advanced';
import { useThread } from '@/hooks/use-threads';
import { ReasoningSelector } from './reasoning-selector';
import {
	useAllAttachmentsUploaded,
	useTempModel,
} from '@/stores/use-temp-data-store';
import { hasEffortControl } from '@/lib/utils';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import { AttachmentManager } from './attachment-manager';
import {
	useTempAttachments,
	useTempActions,
} from '@/stores/use-temp-data-store';
import { AttachmentList } from './attachment-list';
import { toast } from 'sonner';

export function ChatInput() {
	const [message, setMessage] = useState('');
	const { clearAttachments, addUploadedAttachment } = useTempActions();
	const tempAttachments = useTempAttachments();
	const allAttachmentsUploaded = useAllAttachmentsUploaded();

	const { scrollToBottom } = useStickToBottomContext();
	const thread = useThread();

	const sendMessage = useSendMessage();
	const stopStream = useStopStream();
	const modelId = useTempModel();

	const isProcessing =
		thread?.status === 'streaming' || thread?.status === 'pending';
	const disabled = !message.trim() || isProcessing || !allAttachmentsUploaded;

	const handleStop = async () => {
		stopStream(thread?._id).catch((error) => {
			console.error('Failed to stop stream:', error);
		});
	};

	const handleSendMessage = async () => {
		if (!message.trim() || isProcessing) return;

		// Take a snapshot of the message and attachments
		const messageContent = message;
		const attachments = tempAttachments;

		scrollToBottom();
		setMessage('');
		clearAttachments();

		sendMessage(messageContent).catch((error) => {
			console.error('Failed to send message:', error);
			toast.error('Failed to send message');

			// Restore the message and attachments
			setMessage(messageContent);
			attachments.forEach((a) => addUploadedAttachment(a));
		});
	};

	return (
		<div className="w-full absolute left-1/2 -translate-x-[calc(50%+0.5rem)] max-w-3xl z-50 bottom-2 mx-2">
			<AttachmentList />
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
						<PromptInputAction
							delayDuration={300}
							tooltip="Attach files">
							<AttachmentManager modelId={modelId} />
						</PromptInputAction>
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
								disabled={disabled}
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
