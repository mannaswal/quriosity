import { Thread } from '@/lib/types';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
	ArchiveIcon,
	ArchiveRestore,
	PinIcon,
	TextCursorIcon,
	TrashIcon,
} from 'lucide-react';
import { useArchiveThread } from '@/hooks/use-threads';

export const ThreadContextMenu = ({
	children,
	thread,
	handlePinThread,
	handleDeleteThread,
	handleArchiveThread,
	handleRenameOnClick,
}: {
	children: React.ReactNode;
	thread: Thread;
	handlePinThread: () => Promise<void>;
	handleDeleteThread: () => Promise<void>;
	handleArchiveThread: () => Promise<void>;
	handleRenameOnClick: () => void;
}) => {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onClick={handlePinThread}>
					<PinIcon className="size-3.5" />
					{thread.pinned ? 'Unpin' : 'Pin'}
				</ContextMenuItem>
				<ContextMenuItem onClick={handleRenameOnClick}>
					<TextCursorIcon className="size-3.5 text-muted-foreground" />
					Rename
				</ContextMenuItem>
				<ContextMenuItem onClick={handleArchiveThread}>
					{thread.archived ? (
						<ArchiveRestore className="size-3.5" />
					) : (
						<ArchiveIcon className="size-3.5" />
					)}
					{thread.archived ? 'Unarchive' : 'Archive'}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					onClick={handleDeleteThread}
					className="text-rose-500 focus:text-rose-700">
					<TrashIcon className="size-4" />
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
};
