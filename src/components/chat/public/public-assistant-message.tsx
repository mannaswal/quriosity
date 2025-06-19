import { PublicMessage } from '@/lib/types';
import { ModelId, modelsData } from '@/lib/models';
import { canReason, cap, cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { Message } from '@/components/ui/message';
import { BrainIcon, GlobeIcon } from 'lucide-react';
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from '@/components/ui/reasoning';

interface PublicAssistantMessageProps {
	message: PublicMessage;
	index: number;
}

/**
 * Read-only version of assistant message for public shared chats
 * Displays content and reasoning but removes all interactive features
 */
export function PublicAssistantMessage({
	message,
	index,
}: PublicAssistantMessageProps) {
	const content = message.content;
	const reasoning = message.reasoning;

	return (
		<div
			data-id={message._id}
			className={cn('w-full flex flex-col')}>
			<Message
				key={message._id}
				className="flex flex-col w-full text-neutral-100 peer/message">
				{reasoning && (
					<Reasoning className="w-full bg-neutral-900/70 hover:bg-neutral-900/90 transition-colors rounded-xl">
						<ReasoningTrigger className="w-full hover:text-accent-foreground p-4">
							Reasoning
						</ReasoningTrigger>
						<ReasoningContent
							contentClassName="px-4 pb-4"
							className="w-full max-w-full"
							markdown>
							{reasoning}
						</ReasoningContent>
					</Reasoning>
				)}
				{content ? (
					<div className="mt-4">
						<Markdown
							id={message._id}
							className="w-full prose dark:prose-invert flex-1">
							{content}
						</Markdown>
					</div>
				) : (
					!reasoning && (
						<div className="text-sm text-neutral-500">No content generated</div>
					)
				)}
			</Message>

			{/* Model and reasoning effort display */}
			<div className="flex gap-2 text-xs mt-2 h-8 items-center text-neutral-500 peer-hover/message:opacity-100 opacity-0 transition-opacity duration-200">
				<div>{modelsData[message.model as ModelId]?.name || message.model}</div>
				{message.reasoningEffort && canReason(message.model as ModelId) && (
					<>
						<span>•</span>
						<div className="flex items-center gap-1">
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
						<span>•</span>
						<div className="flex items-center gap-1">
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
	);
}
