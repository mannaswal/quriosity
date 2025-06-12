import { useState } from 'react';
import { ChatMessage } from '@/lib/types';
import { useBranchThread } from '@/hooks/use-threads';
import { models } from '@/lib/models';
import { cn } from '@/lib/utils';
import { Button } from '../../ui/button';
import { Markdown } from '../../ui/markdown';
import { Message } from '@/components/ui/message';
import { CheckIcon, CopyIcon, RefreshCcwIcon, SplitIcon } from 'lucide-react';
import { useMessageContent, StreamingCursor } from './streaming-message';
import { Loader } from '@/components/ui/loader';
import { useRegenerate } from '@/hooks/use-messages';

interface AssistantMessageProps {
	message: ChatMessage;
}

/**
 * Component for rendering assistant messages with copy and branch functionality
 * Now supports real-time streaming content
 */
export function AssistantMessage({ message }: AssistantMessageProps) {
	const [copied, setCopied] = useState(false);
	const [isBranching, setIsBranching] = useState(false);

	const branch = useBranchThread();
	const regenerate = useRegenerate({});

	// Get streaming-aware content
	const { content, isStreaming, isPending } = useMessageContent(
		message._id,
		message.content,
		message.status
	);

	const handleBranch = async () => {
		try {
			setIsBranching(true);
			await branch({ messageId: message._id });
		} catch (error) {
			setIsBranching(false);
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(content);
		setCopied(true);
		setTimeout(() => {
			setCopied(false);
		}, 2000);
	};

	const handleRegenerate = async () => {
		try {
			await regenerate({
				messageId: message._id,
				threadId: message.threadId,
			});
		} catch (error) {}
	};

	return (
		<div className="w-full flex flex-col gap-2">
			{isPending && (
				<Loader
					variant="pulse-dot"
					className="mt-2.5"
				/>
			)}
			<Message
				key={message._id}
				className="peer/message flex flex-col w-full text-neutral-100">
				<div className="flex items-start">
					<Markdown
						id={message._id}
						className="max-w-full prose dark:prose-invert flex-1">
						{content}
					</Markdown>
				</div>
			</Message>

			{message.status === 'error' && (
				<div className="text-xs text-rose-400/80 text-center">
					An error occurred
				</div>
			)}

			{(message.status === 'complete' || (!isStreaming && content)) && (
				<div className="flex items-center opacity-0 transition-opacity duration-300 peer-hover/message:opacity-100 hover:opacity-100 -ml-0.5">
					<Button
						onClick={handleRegenerate}
						disabled={isPending}
						variant="ghost"
						size="icon"
						className="size-8">
						<RefreshCcwIcon className="size-4" />
					</Button>

					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						disabled={isBranching}
						onClick={handleBranch}>
						<SplitIcon className="size-4 rotate-180" />
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
					<div className="flex gap-2 text-xs ml-2">
						<div className="text-neutral-500">
							<div>{models.find((m) => m.id === message.modelUsed)?.name}</div>
						</div>

						{message.stopReason === 'stopped' && (
							<>
								<span className="text-accent">•</span>
								<div className="text-xs text-rose-400/80 text-center">
									Stopped by user
								</div>
							</>
						)}
						{message.stopReason === 'error' && (
							<>
								<span className="text-accent">•</span>
								<div className="text-xs text-rose-400/80 text-center">
									An error occurred
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
