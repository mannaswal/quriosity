import { PublicThread } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Clock, UsersIcon } from 'lucide-react';

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
	if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
	if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
	return 'Just now';
}

interface PublicChatHeaderProps {
	thread: PublicThread;
}

/**
 * Header component for public shared chats
 */
export function PublicChatHeader({ thread }: PublicChatHeaderProps) {
	return (
		<div className="fixed top-0 left-0 w-full z-[6] p-6">
			<div className="flex items-start justify-between flex-col gap-2">
				<div className="flex items-center justify-between gap-2 w-full">
					<h1 className="text-lg font-semibold text-foreground leading-none">
						{thread.title}
					</h1>
					<Badge
						variant="secondary"
						className="shrink-0 text-xs text-muted-foreground font-normal bg-input/50 backdrop-blur-sm">
						<UsersIcon className="size-3 mr-0.5" />
						Shared Chat
					</Badge>
				</div>
				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<Clock className="size-3" />
					{formatRelativeTime(new Date(thread._creationTime))}
				</div>
			</div>
		</div>
	);
}
