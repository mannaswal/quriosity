import { useState, useEffect } from 'react';
import { Message as ChatMessage } from '@/lib/types';
import { useRegenerate, useEditAndResubmit } from '@/hooks/use-messages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Markdown } from '@/components/ui/markdown';
import { Message } from '@/components/ui/message';
import { CheckIcon, CopyIcon, RefreshCcwIcon, PencilIcon } from 'lucide-react';

interface UserMessageProps {
	message: ChatMessage;
}

/**
 * Component for rendering user messages with edit, regenerate, and copy functionality
 */
export function UserMessage({ message }: UserMessageProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedContent, setEditedContent] = useState(message.content);
	const [copied, setCopied] = useState(false);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const [isEditingAndResubmitting, setIsEditingAndResubmitting] =
		useState(false);

	const regenerate = useRegenerate({
		onSuccess: () => setIsRegenerating(false),
		onError: () => setIsRegenerating(false),
	});

	const editAndResubmit = useEditAndResubmit({
		onSuccess: () => {
			setIsEditing(false);
			setIsEditingAndResubmitting(false);
		},
		onError: () => setIsEditingAndResubmitting(false),
	});

	const isPending = isRegenerating || isEditingAndResubmitting;

	// Sync editedContent when message.content changes and we're not editing
	useEffect(() => {
		if (!isEditing) {
			setEditedContent(message.content);
		}
	}, [message.content, isEditing]);

	// If the edited content is the same as the original content, regenerate the message
	// If the edited content is different, edit and resubmit the message
	const handleRegenerate = async () => {
		try {
			if (editedContent === message.content) {
				setIsRegenerating(true);
				await regenerate({
					messageId: message._id,
					threadId: message.threadId,
				});
			} else if (editedContent.trim()) {
				setIsEditingAndResubmitting(true);
				await editAndResubmit({
					userMessageId: message._id,
					threadId: message.threadId,
					newContent: editedContent,
				});
			}
			setIsEditing(false);
		} catch (error) {
			setIsRegenerating(false);
			setIsEditingAndResubmitting(false);
		}
	};

	const handleSaveEdit = async () => {
		if (editedContent.trim()) {
			try {
				setIsEditingAndResubmitting(true);
				await editAndResubmit({
					userMessageId: message._id,
					threadId: message.threadId,
					newContent: editedContent,
				});
			} catch (error) {
				setIsEditingAndResubmitting(false);
			}
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(message.content);
		setCopied(true);
		setTimeout(() => {
			setCopied(false);
		}, 2000);
	};

	return (
		<div className="w-full flex flex-col gap-2 items-end">
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
					className="md:text-base bg-neutral-800 max-w-xl w-full self-end py-2.5 px-4 rounded-2xl rounded-br-md prose dark:prose-invert min-h-0 focus-visible:ring-0 focus-visible:ring-offset-0 leading-7 -my-px"
					autoFocus
				/>
			) : (
				<Message
					key={message._id}
					className="peer/message flex flex-col bg-neutral-800 max-w-xl w-fit self-end py-2.5 px-4 rounded-2xl rounded-br-md">
					<Markdown
						id={message._id}
						className="max-w-full prose dark:prose-invert">
						{message.content}
					</Markdown>
				</Message>
			)}

			<div className="w-full flex items-center justify-end opacity-0 transition-opacity duration-300 peer-hover/message:opacity-100 hover:opacity-100 mb-1">
				<Button
					onClick={handleRegenerate}
					disabled={isPending}
					variant="ghost"
					size="icon"
					className="size-8">
					<RefreshCcwIcon className="size-4" />
				</Button>
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
					onClick={handleCopy}>
					{copied ? (
						<CheckIcon className="w-4 h-4" />
					) : (
						<CopyIcon className="w-4 h-4" />
					)}
				</Button>
			</div>
		</div>
	);
}
