import { useState, useEffect } from 'react';
import { Message as ChatMessage, ReasoningEffort } from '@/lib/types';
import { ModelId } from '@/lib/models';
import { useRegenerate, useEditAndResubmit } from '@/hooks/use-messages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Markdown } from '@/components/ui/markdown';
import { Message } from '@/components/ui/message';
import { CheckIcon, CopyIcon, PencilIcon, SquarePenIcon } from 'lucide-react';
import { toast } from 'sonner';
import { RetryButtonAdvanced } from '../input/retry-button-advanced';
import { MessageAttachmentList } from '../input/attachment-list';

interface UserMessageProps {
	message: ChatMessage;
	index: number;
}

/**
 * Component for rendering user messages with edit, regenerate, and copy functionality
 */
export function UserMessage({ message }: UserMessageProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedContent, setEditedContent] = useState(message.content);
	const [copied, setCopied] = useState(false);
	const [isRetryMenuOpen, setIsRetryMenuOpen] = useState(false);

	const regenerate = useRegenerate();
	const editAndResubmit = useEditAndResubmit();

	useEffect(() => {
		if (!isEditing) setEditedContent(message.content);
	}, [message.content, isEditing]);

	const handleRegenerate = async (
		model?: ModelId,
		reasoningEffort?: ReasoningEffort,
		useWebSearch?: boolean
	) => {
		try {
			setIsEditing(false);
			if (editedContent === message.content) {
				// If the edited content is the same as the original content, regenerate the message
				await regenerate({
					messageId: message._id,
					threadId: message.threadId,
					model: model ?? (message.model as ModelId),
					reasoningEffort: reasoningEffort ?? message.reasoningEffort,
					useWebSearch: useWebSearch ?? message.useWebSearch,
				});
			} else if (editedContent.trim()) {
				// If the edited content is different, edit and resubmit the message
				await editAndResubmit({
					userMessageId: message._id,
					threadId: message.threadId,
					newContent: editedContent,
					model: model ?? (message.model as ModelId),
					reasoningEffort: reasoningEffort ?? message.reasoningEffort,
					useWebSearch: useWebSearch ?? message.useWebSearch,
				});
			}
		} catch (error) {
			toast.error('Failed to regenerate message');
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
		<div
			data-id={message._id}
			className="w-full flex flex-col items-end">
			{isEditing ? (
				<Textarea
					value={editedContent}
					onChange={(e) => setEditedContent(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							handleRegenerate();
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
					className="peer flex flex-col bg-neutral-800 max-w-xl w-fit self-end py-2.5 px-4 rounded-2xl rounded-br-md">
					<Markdown
						id={message._id}
						className="max-w-full prose dark:prose-invert">
						{message.content}
					</Markdown>
				</Message>
			)}

			<MessageAttachmentList message={message} />

			<div
				className={`flex items-center justify-end transition-opacity duration-300 h-10 pt-2 focus-within:opacity-100 focus:opacity-100 ${
					isRetryMenuOpen
						? 'opacity-100'
						: 'opacity-0 peer-hover:opacity-100 hover:opacity-100'
				}`}>
				<RetryButtonAdvanced
					handleRegenerate={handleRegenerate}
					onOpenChange={setIsRetryMenuOpen}
					message={message}
				/>
				<Button
					onClick={() => setIsEditing((prev) => !prev)}
					variant="ghost"
					size="icon"
					className="size-8">
					<SquarePenIcon className="size-4" />
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
