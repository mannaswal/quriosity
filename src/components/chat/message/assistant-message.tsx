import { useState } from 'react';
import { useBranchThread } from '@/hooks/use-threads';
import { ModelId, modelsData } from '@/lib/models';
import { canReason, cap, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { Message } from '@/components/ui/message';
import {
	BrainIcon,
	CheckIcon,
	CopyIcon,
	GlobeIcon,
	SplitIcon,
} from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { useRegenerate } from '@/hooks/use-messages';
import { Message as ChatMessage, ReasoningEffort } from '@/lib/types';
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from '@/components/ui/reasoning';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { RetryButtonAdvanced } from '../input/retry-button-advanced';
import { toast } from 'sonner';

interface AssistantMessageProps {
	message: ChatMessage;
	index: number;
}

/**
 * Component for rendering assistant messages with copy and branch functionality
 * Now supports real-time streaming content
 */
export function AssistantMessage({ message, index }: AssistantMessageProps) {
	const [copied, setCopied] = useState(false);
	const [isBranching, setIsBranching] = useState(false);
	const [isRetryMenuOpen, setIsRetryMenuOpen] = useState(false);

	const branch = useBranchThread();
	const regenerate = useRegenerate();

	const content = message.content;
	const reasoning = message.reasoning;

	const isComplete = message.status === 'done' || message.status === 'error';
	const isPending = message.status === 'pending';
	const isReasoning = reasoning && !content && !isComplete;
	const isLoading = isPending && !content && !reasoning && !isComplete;

	const isError = message.status === 'error' || message.stopReason === 'error';
	const isStopped = message.stopReason === 'stopped';

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

	const handleRegenerate = async (
		model?: ModelId,
		reasoningEffort?: ReasoningEffort,
		useWebSearch?: boolean
	) => {
		try {
			await regenerate({
				messageId: message._id,
				threadId: message.threadId,
				model: model ?? (message.model as ModelId),
				reasoningEffort: reasoningEffort ?? message.reasoningEffort,
				useWebSearch: useWebSearch ?? message.useWebSearch,
			});
		} catch (error) {
			toast.error('Failed to regenerate message');
		}
	};

	return (
		<div
			data-id={message._id}
			className={cn(
				'w-full flex flex-col',
				index > 2 && 'last:min-h-[calc(100vh-20rem)]'
			)}>
			{isLoading && (
				<Loader
					variant="pulse-dot"
					className="mt-2.5"
				/>
			)}
			<Message
				key={message._id}
				className="peer/message flex flex-col w-full text-neutral-100">
				{reasoning && (
					<Reasoning className="w-full bg-neutral-900/70 hover:bg-neutral-900/90 transition-colors rounded-xl">
						<ReasoningTrigger className="w-full hover:text-accent-foreground p-4">
							{isReasoning ? <TextShimmer>Reasoning</TextShimmer> : 'Reasoning'}
						</ReasoningTrigger>
						<ReasoningContent
							contentClassName="px-4 pb-4"
							className="w-full max-w-full"
							markdown>
							{reasoning}
						</ReasoningContent>
					</Reasoning>
				)}
				{isComplete && !content ? (
					!reasoning && (
						<div className="text-sm text-neutral-500">No content generated</div> // No content, no reasoning
					)
				) : (
					<div className="mt-4">
						<Markdown
							id={message._id}
							className="w-full prose dark:prose-invert flex-1">
							{content}
						</Markdown>
					</div>
				)}
				{(isError || isStopped) && (
					<div className="text-sm text-rose-400/80">
						{isError && 'Failed to generate message. Please try regenerating.'}
						{isStopped && 'Stopped by user'}
					</div>
				)}
			</Message>
			<div
				className={`flex items-center justify-start transition-opacity duration-300 h-10 pt-2 focus-within:opacity-100 ${
					isRetryMenuOpen
						? 'opacity-100'
						: 'opacity-0 peer-hover/message:opacity-100 hover:opacity-100'
				}`}>
				{(message.status === 'error' || message.status === 'done') && (
					<div className="flex items-center -ml-0.5">
						<RetryButtonAdvanced
							handleRegenerate={handleRegenerate}
							onOpenChange={setIsRetryMenuOpen}
							message={message}
						/>

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

						<div className="flex gap-2 text-xs ml-2 items-center">
							<div className="text-neutral-500">
								{modelsData[message.model as ModelId].name}
							</div>
							{message.reasoningEffort &&
								canReason(message.model as ModelId) && (
									<>
										<span className="text-neutral-500">•</span>
										<div className="text-neutral-500 flex items-center gap-1">
											<BrainIcon
												className="size-3"
												strokeWidth={1.5}
											/>
											{cap(message.reasoningEffort)}
										</div>
									</>
								)}
							{message.useWebSearch && (
								<>
									<span className="text-neutral-500">•</span>
									<div className="text-neutral-500 flex items-center gap-1">
										<GlobeIcon
											className="size-3"
											strokeWidth={1.5}
										/>
										Web search
									</div>
								</>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
