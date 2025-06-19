'use client';

import { SendIcon, StopCircleIcon, GlobeIcon } from 'lucide-react';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Button } from '@/components/ui/button';
import { useSendMessage } from '@/hooks/use-messages';
import { useStopStream } from '@/hooks/use-threads';
import { ModelSelectorAdvanced } from './model-selector-advanced';
import { ReasoningSelector } from './reasoning-selector';
import {
	useAllAttachmentsUploaded,
	useTempInputText,
	useTempModel,
	useTempUseWebSearch,
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
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { useThreads } from '@/hooks/use-threads';
import { useWebSearch, useUpdateWebSearch } from '@/hooks/use-user';

export function ChatInput({
	thread,
	user,
}: {
	thread: Thread | undefined;
	user: User | undefined;
}) {
	const modelId = useTempModel();
	const textInput = useTempInputText();
	const useWebSearch = useTempUseWebSearch();
	const tempAttachments = useTempAttachments();
	const allAttachmentsUploaded = useAllAttachmentsUploaded();

	const {
		setInputText,
		clearAttachments,
		addUploadedAttachment,
		setUseWebSearch,
	} = useTempActions();

	const { scrollToBottom } = useStickToBottomContext();

	const sendMessage = useSendMessage();
	const stopStream = useStopStream();

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
		<div className="w-full absolute left-1/2 -translate-x-1/2 max-w-3xl z-50 bottom-2 px-2">
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
						<ModelSelectorAdvanced modelId={modelId} />
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
							tooltip="Web search">
							<WebSearchToggle />
						</PromptInputAction>
						<PromptInputAction
							delayDuration={300}
							tooltip="Project">
							<ProjectSelector />
						</PromptInputAction>
					</div>
					<TooltipWrapper
						delayDuration={300}
						tooltip={
							isProcessing
								? 'Stop'
								: disabled
								? !allAttachmentsUploaded
									? 'Attachments are still uploading'
									: "Can't send empty message"
								: 'Send'
						}>
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
					</TooltipWrapper>
				</PromptInputActions>
			</PromptInput>
		</div>
	);
}

function WebSearchToggle() {
	const webSearchEnabled = useWebSearch();
	const updateWebSearch = useUpdateWebSearch();

	const handleToggle = async () => {
		try {
			await updateWebSearch(!webSearchEnabled);
		} catch (error) {
			toast.error('Failed to update web search preference');
		}
	};

	return (
		<TooltipWrapper
			tooltip={webSearchEnabled ? 'Disable web search' : 'Enable web search'}>
			<Button
				onClick={handleToggle}
				variant="ghost"
				size="icon"
				className={` ${
					webSearchEnabled
						? 'bg-muted text-sky-400 hover:text-sky-400'
						: 'text-foreground hover:text-foreground'
				}`}>
				<GlobeIcon
					className="size-4"
					strokeWidth={1.2}
				/>
			</Button>
		</TooltipWrapper>
	);
}
