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
	useTempInputText,
	useTempModel,
} from '@/stores/use-temp-data-store';
import { hasEffortControl } from '@/lib/utils';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import { AttachmentManager } from './attachment-manager';
import {
	useTempAttachments,
	useTempActions,
} from '@/stores/use-temp-data-store';
import { InputAttachmentList } from './attachment-list';
import { toast } from 'sonner';
import { ProjectSelector } from './project-selector';
import { Thread, User } from '@/lib/types';
import { ModelId } from '@/lib/models';

export function ChatInput({
	thread,
	user,
}: {
	thread: Thread | undefined;
	user: User | undefined;
}) {
	const tempModel = useTempModel();
	const textInput = useTempInputText();
	const { setInputText } = useTempActions();
	const { clearAttachments, addUploadedAttachment } = useTempActions();
	const tempAttachments = useTempAttachments();
	const allAttachmentsUploaded = useAllAttachmentsUploaded();

	const { scrollToBottom } = useStickToBottomContext();

	const sendMessage = useSendMessage();
	const stopStream = useStopStream();

	const modelId = (thread?.model ??
		user?.lastModelUsed ??
		tempModel) as ModelId;

	const isProcessing =
		thread?.status === 'streaming' || thread?.status === 'pending';
	const disabled = !textInput.trim() || isProcessing || !allAttachmentsUploaded;

	const handleStop = async () => {
		stopStream(thread?._id).catch((error) => {
			console.error('Failed to stop stream:', error);
		});
	};

	const handleSendMessage = async () => {
		if (disabled) {
			if (!allAttachmentsUploaded)
				toast.error('Attachments are still uploading');
			return;
		}

		// Take a snapshot of the message and attachments
		const messageContent = textInput;
		const attachments = tempAttachments;

		scrollToBottom();
		setInputText('');
		clearAttachments();

		sendMessage(messageContent).catch((error) => {
			console.error('Failed to send message:', error);
			toast.error('Failed to send message');

			// Restore the message and attachments
			setInputText(messageContent);
			attachments.forEach((a) => addUploadedAttachment(a));
		});
	};

	return (
		<div className="w-full absolute left-1/2 -translate-x-[calc(50%+0.5rem)] max-w-3xl z-50 bottom-2 mx-2">
			<InputAttachmentList />
			<PromptInput
				onSubmit={handleSendMessage}
				onValueChange={setInputText}
				value={textInput}>
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
							<ModelSelectorAdvanced modelId={modelId} />
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
						<PromptInputAction
							delayDuration={300}
							tooltip="Project">
							<ProjectSelector />
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
