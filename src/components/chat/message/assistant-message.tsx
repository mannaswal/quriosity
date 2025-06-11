import { useState } from 'react';
import { ChatMessage } from '@/lib/types';
import { useBranchThread } from '@/hooks/use-threads';
import { models } from '@/lib/models';
import { cn } from '@/lib/utils';
import { Button } from '../../ui/button';
import { Markdown } from '../../ui/markdown';
import { Message } from '@/components/ui/message';
import { CheckIcon, CopyIcon, SplitIcon } from 'lucide-react';

interface AssistantMessageProps {
	message: ChatMessage;
}

/**
 * Component for rendering assistant messages with copy and branch functionality
 */
export function AssistantMessage({ message }: AssistantMessageProps) {
	const [copied, setCopied] = useState(false);
	const [isBranching, setIsBranching] = useState(false);

	const branch = useBranchThread();

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

	return (
		<div className="w-full flex flex-col gap-2">
			<Message
				key={message._id}
				className="peer/message flex flex-col w-full text-neutral-100">
				<Markdown
					id={message._id}
					className="max-w-full prose dark:prose-invert">
					{message.content}
				</Markdown>
			</Message>

			{message.status === 'complete' && (
				<div className="flex items-center opacity-0 transition-opacity duration-300 peer-hover/message:opacity-100 hover:opacity-100 -ml-0.5">
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
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						disabled={isBranching}
						onClick={handleBranch}>
						<SplitIcon className="size-4 rotate-180" />
					</Button>
					<div className="text-xs text-neutral-500 ml-2">
						<div>{models.find((m) => m.id === message.modelUsed)?.name}</div>
					</div>
				</div>
			)}
		</div>
	);
}
