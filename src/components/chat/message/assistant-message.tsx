import { useState } from 'react';
import { useBranchThread } from '@/hooks/use-threads';
import { models } from '@/lib/models';
import { cn } from '@/lib/utils';
import { Button } from '../../ui/button';
import { Markdown } from '../../ui/markdown';
import { Message } from '@/components/ui/message';
import { CheckIcon, CopyIcon, RefreshCcwIcon, SplitIcon } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { useRegenerate } from '@/hooks/use-messages';
import { Message as ChatMessage } from '@/lib/types';
import {
	Reasoning,
	ReasoningContent,
	ReasoningResponse,
	ReasoningTrigger,
} from '@/components/ui/reasoning';
import { TextShimmer } from '@/components/ui/text-shimmer';

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

	const isPending = message.status === 'pending';
	const isComplete = message.status === 'done' || message.status === 'error';

	const content = message.content;
	const reasoning = message.reasoning;

	const handleBranch = async () => {
		try {
			setIsBranching(true);
			await branch({ messageId: message._id });
		} catch (error) {
			setIsBranching(false);
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(message.content);
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
		<div
			data-id={message._id}
			className="w-full flex flex-col gap-2">
			{message.status === 'pending' && !content && !reasoning && (
				<Loader
					variant="pulse-dot"
					className="mt-2.5"
				/>
			)}
			<Message
				key={message._id}
				className="peer/message flex flex-col w-full text-neutral-100 space-y-4">
				{reasoning && (
					<Reasoning className="w-full bg-neutral-900/50 rounded-xl p-4">
						<ReasoningTrigger>
							{reasoning && !content ? (
								<TextShimmer>Reasoning</TextShimmer>
							) : (
								'Reasoning'
							)}
						</ReasoningTrigger>
						<ReasoningContent
							className="w-full max-w-full"
							markdown>
							{reasoning}
						</ReasoningContent>
					</Reasoning>
				)}
				<div className="flex flex-col items-start gap-4">
					{isComplete && !content ? (
						<div className="text-sm text-neutral-500">No content generated</div>
					) : (
						<Markdown
							id={message._id}
							className="max-w-full prose dark:prose-invert flex-1">
							{content}
						</Markdown>
					)}
				</div>
			</Message>
			{(message.status === 'error' || message.stopReason === 'error') && (
				<div className="text-sm text-rose-400/80">An error occurred</div>
			)}
			{message.stopReason === 'stopped' && (
				<div className="text-sm text-rose-400/80">Stopped by user</div>
			)}

			<div className="h-8 opacity-0 transition-opacity duration-300 peer-hover/message:opacity-100 hover:opacity-100">
				{(message.status === 'error' || message.status === 'done') && (
					<div className="flex items-center -ml-0.5">
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
								<div>
									{models.find((m) => m.id === message.modelUsed)?.name}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
