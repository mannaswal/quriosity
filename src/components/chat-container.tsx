'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import {
	Message,
	MessageAvatar,
	MessageContent,
} from '@/components/ui/message';
import {
	ChatContainerRoot,
	ChatContainerContent,
} from '@/components/ui/chat-container';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/lib/types';
import {
	useMessages,
	useRegenerate,
	useEditAndResubmit,
} from '@/hooks/use-messages';
import { Id } from '../../convex/_generated/dataModel';
import { models } from '@/lib/models';
import {
	CheckIcon,
	CopyIcon,
	EditIcon,
	RefreshCcwIcon,
	PencilIcon,
} from 'lucide-react';
import { ProgressiveBlur } from './ui/progressive-blur';
import { Textarea } from './ui/textarea';

interface ChatContainerProps {
	threadId?: Id<'threads'>;
}

// Memoized message item component to prevent unnecessary re-renders
const MessageItem = memo(function MessageItem({
	message,
	showRetry,
}: {
	message: ChatMessage;
	showRetry: boolean;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedContent, setEditedContent] = useState(message.content);
	const [copied, setCopied] = useState(false);
	const { mutate: regenerate, isPending: isRegenerating } = useRegenerate({});
	const { mutate: editAndResubmit, isPending: isEditingAndResubmitting } =
		useEditAndResubmit({
			onSuccess: () => setIsEditing(false),
		});

	const isPending = isRegenerating || isEditingAndResubmitting;

	// If the edited content is the same as the original content, regenerate the message
	// If the edited content is different, edit and resubmit the message
	const handleRegenerate = () => {
		if (message.role === 'user') {
			if (editedContent === message.content) {
				regenerate({
					userMessageId: message._id,
					threadId: message.threadId,
				});
			} else if (editedContent.trim()) {
				editAndResubmit({
					userMessageId: message._id,
					threadId: message.threadId,
					newContent: editedContent,
				});
			}
			setIsEditing(false);
		}
	};

	const handleSaveEdit = () => {
		if (message.role === 'user' && editedContent.trim()) {
			editAndResubmit({
				userMessageId: message._id,
				threadId: message.threadId,
				newContent: editedContent,
			});
		}
	};

	return (
		<div
			className={cn(
				'w-full flex flex-col gap-2',
				message.role === 'user' && 'items-end'
			)}>
			{isEditing ? (
				<Textarea
					value={editedContent}
					onChange={(e) => setEditedContent(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							handleSaveEdit();
							setIsEditing(false);
						} else if (e.key === 'Escape') {
							setIsEditing(false);
						}
					}}
					className="md:text-base bg-neutral-800 max-w-xl w-fit self-end py-2.5 px-4 rounded-2xl rounded-br-md prose dark:prose-invert min-h-0 focus-visible:ring-0 focus-visible:ring-offset-0 leading-7 -my-px"
					autoFocus
				/>
			) : (
				<Message
					key={message._id}
					className={cn(
						'peer/message flex flex-col w-fit',
						message.role === 'user' &&
							'bg-neutral-800 max-w-xl self-end py-2.5 px-4 rounded-2xl rounded-br-md',
						message.role === 'assistant' && 'text-neutral-100'
					)}>
					<Markdown
						id={message._id}
						className="max-w-full prose dark:prose-invert">
						{message.content}
					</Markdown>
				</Message>
			)}
			<div className="flex items-center opacity-0 transition-opacity duration-300 peer-hover/message:opacity-100 hover:opacity-100">
				{message.role === 'assistant' && message.status === 'complete' ? (
					<>
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							onClick={(e) => {
								navigator.clipboard.writeText(message.content);
								setCopied(true);

								setTimeout(() => {
									setCopied(false);
								}, 2000);
							}}>
							{copied ? (
								<CheckIcon className="w-4 h-4" />
							) : (
								<CopyIcon className="w-4 h-4" />
							)}
						</Button>
						<div className="text-xs text-neutral-500">
							<div>{models.find((m) => m.id === message.modelUsed)?.name}</div>
						</div>
					</>
				) : message.role === 'user' ? (
					<>
						{showRetry && (
							<Button
								onClick={handleRegenerate}
								disabled={isPending}
								variant="ghost"
								size="icon"
								className="size-8">
								<RefreshCcwIcon className="size-4" />
							</Button>
						)}
						<Button
							onClick={() => setIsEditing((prev) => !prev)}
							disabled={isPending}
							variant="ghost"
							size="icon"
							className="size-8">
							<PencilIcon className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							onClick={(e) => {
								navigator.clipboard.writeText(message.content);
								setCopied(true);

								setTimeout(() => {
									setCopied(false);
								}, 2000);
							}}>
							{copied ? (
								<CheckIcon className="w-4 h-4" />
							) : (
								<CopyIcon className="w-4 h-4" />
							)}
						</Button>
					</>
				) : null}
			</div>
		</div>
	);
});

const ChatContainer = memo(function ChatContainer({
	threadId,
}: ChatContainerProps) {
	const messages = useMessages(threadId) ?? [];

	return (
		<div className="flex h-screen w-full flex-col overflow-hidden justify-end pb-2">
			<ProgressiveBlur
				className="pointer-events-none absolute top-0 left-0 h-14 w-full"
				blurIntensity={0.4}
				blurLayers={12}
				direction="top"
			/>
			<div className="absolute top-0 left-0 h-14 w-full bg-gradient-to-t from-transparent to-background/95" />
			<ChatContainerRoot className="flex-1">
				<ChatContainerContent className="p-4 max-w-3xl mx-auto pt-14 pb-32 space-y-1">
					{messages.map((message, index) => {
						const showRetry =
							message.role === 'user' &&
							messages[index + 1]?.role === 'assistant';
						return (
							<MessageItem
								key={message._id}
								message={message as ChatMessage}
								showRetry={showRetry}
							/>
						);
					})}
				</ChatContainerContent>
			</ChatContainerRoot>
		</div>
	);
});

export default ChatContainer;
