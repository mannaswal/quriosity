import { PublicMessage } from '@/lib/types';
import { Markdown } from '@/components/ui/markdown';
import { Message } from '@/components/ui/message';
import { PublicMessageAttachmentList } from './public-attachment-list';

interface PublicUserMessageProps {
	message: PublicMessage;
	index: number;
}

/**
 * Read-only version of user message for public shared chats
 * Maintains the same visual styling but removes interactive features
 */
export function PublicUserMessage({ message }: PublicUserMessageProps) {
	return (
		<div
			data-id={message._id}
			className="w-full flex flex-col items-end mb-14">
			<Message
				key={message._id}
				className="flex flex-col bg-neutral-800 max-w-xl w-fit self-end py-2.5 px-4 rounded-2xl rounded-br-md">
				<Markdown
					id={message._id}
					className="max-w-full prose dark:prose-invert">
					{message.content}
				</Markdown>
			</Message>
			<PublicMessageAttachmentList message={message} />
		</div>
	);
}
