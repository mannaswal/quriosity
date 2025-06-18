import { Thread, ThreadId } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Button } from '../ui/button';
import { PinIcon, PinOffIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader } from '../ui/loader';
import { Id } from 'convex/_generated/dataModel';
import { SplitIcon } from 'lucide-react';
import Link from 'next/link';
import {
	useDeleteThread,
	useArchiveThread,
	usePinThread,
	useRenameThread,
} from '@/hooks/use-threads';
import { DeleteThreadButton } from './delete-thread-button';
import { ThreadContextMenu } from './thread-context-menu';

/**
 * Individual thread item component with all thread-related functionality
 */
export const SidebarThreadItem = ({
	thread,
	activeThreadId,
}: {
	thread: Thread;
	activeThreadId: ThreadId | undefined;
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editingTitle, setEditingTitle] = useState<string>('');

	const pinThread = usePinThread();
	const archiveThread = useArchiveThread();
	const deleteThread = useDeleteThread();
	const renameThread = useRenameThread();

	const threadId = thread._id;

	const handlePinThread = async () => {
		await pinThread({ threadId, pinned: !thread.pinned });
	};

	const handleDeleteThread = async () => {
		await deleteThread(threadId);
	};

	const handleArchiveThread = async () => {
		await archiveThread({ threadId, archived: !thread.archived });
	};

	const handleRenameOnClick = () => {
		console.log('handleRenameOnClick');
		setEditingTitle(thread.title);
		setIsEditing(true);

		setTimeout(() => {
			const input = document.getElementById(`thread-title-${threadId}`);
			if (input) {
				(input as HTMLInputElement).focus();
			}
		}, 10);
	};

	/**
	 * Cancel editing and revert to original title
	 */
	const cancelEditing = () => {
		setIsEditing(false);
		setEditingTitle('');
	};

	/**
	 * Save the edited title
	 */
	const saveTitle = async () => {
		if (!isEditing) return;

		const trimmedTitle = editingTitle.trim();

		// If title is empty after trimming, revert to original
		if (!trimmedTitle) {
			cancelEditing();
			return;
		}

		// If title hasn't changed, just cancel editing
		if (trimmedTitle === thread.title) {
			cancelEditing();
			return;
		}

		try {
			await renameThread({ threadId, newTitle: trimmedTitle });
			cancelEditing();
		} catch (error) {
			// Revert to original title on error
			cancelEditing();
		}
	};

	/**
	 * Handle key press in input field
	 */
	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveTitle();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEditing();
		}
	};

	const isStreaming = thread.status === 'streaming';

	return (
		<SidebarMenuItem className="rounded-md overflow-hidden">
			<ThreadContextMenu
				thread={thread}
				handlePinThread={handlePinThread}
				handleDeleteThread={handleDeleteThread}
				handleArchiveThread={handleArchiveThread}
				handleRenameOnClick={handleRenameOnClick}>
				<div className="flex items-center w-full group/menu-item">
					<SidebarMenuButton
						className="flex-1 min-w-0 cursor-pointer group-hover/menu-item:bg-sidebar-accent focus:bg-sidebar-accent focus-visible:bg-sidebar-accent data-[active=true]:font-normal group-focus-within/menu-item:bg-sidebar-accent group-focus-visible/menu-item:bg-sidebar-accent"
						asChild
						isActive={thread._id === activeThreadId}>
						{isEditing ? (
							<input
								type="text"
								id={`thread-title-${thread._id}`}
								value={editingTitle}
								onChange={(e) => setEditingTitle(e.target.value)}
								onBlur={saveTitle}
								onKeyDown={handleKeyPress}
								className="bg-transparent border-none outline-none text-sm w-full min-w-0 focus:ring-0 focus:outline-none cursor-text"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
								}}
							/>
						) : (
							<Link
								href={`/chat/${thread._id}`}
								className="text-sm hover:text-foreground transition-colors flex-1 min-w-0">
								<>
									{thread.parentMessageId && (
										<SplitIcon className="size-3.5 shrink-0 text-muted-foreground rotate-180" />
									)}
									<span
										onContextMenu={() => {}}
										onDoubleClick={(e) => {
											handleRenameOnClick();
											e.preventDefault();
											e.stopPropagation();
										}}>
										{thread.title}
									</span>
								</>
							</Link>
						)}
					</SidebarMenuButton>
					{isStreaming && (
						<div className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center justify-center p-1 transition-opacity z-[5] animate-in fade-in-0 duration-200 fade-out-0 rounded-sm bg-sidebar-accent size-6">
							<Loader
								variant="pulse"
								size="sm"
								className="scale-90"
							/>
						</div>
					)}

					<div
						data-state={isEditing ? 'editing' : 'not-editing'}
						className={cn(
							'text-sidebar-foreground hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1/2 -translate-y-1/2 right-0 flex items-center justify-center bg-sidebar-accent h-full p-1 transition-opacity z-10',
							'group-hover/menu-item:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 group-focus-visible/menu-item:opacity-100 opacity-0',
							'data-[state=editing]:hidden'
						)}>
						<div className="w-4 h-full bg-gradient-to-r to-sidebar-accent from-transparent absolute left-0 -translate-x-full" />

						<Button
							variant="ghost"
							size="icon"
							className={cn(
								'size-6 shrink-0 rounded-sm dark:hover:bg-sidebar-accent-foreground/20 cursor-pointer'
							)}
							onClick={(e) => {
								handlePinThread();
								e.stopPropagation();
							}}>
							{thread.pinned ? (
								<PinOffIcon className="size-3" />
							) : (
								<PinIcon className="size-3" />
							)}
						</Button>
						<DeleteThreadButton
							thread={thread}
							handleDeleteThread={handleDeleteThread}
							inside="sidebar"
						/>
					</div>
				</div>
			</ThreadContextMenu>
		</SidebarMenuItem>
	);
};
