import { Thread } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Button } from '../ui/button';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '../ui/context-menu';
import {
	PinIcon,
	PinOffIcon,
	XIcon,
	TextCursorIcon,
	TrashIcon,
	ArchiveIcon,
	ArchiveRestore,
} from 'lucide-react';
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
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
} from '../ui/dialog';

/**
 * Individual thread item component with all thread-related functionality
 */
export const ThreadItem = ({
	thread,
	currentThreadId,
}: {
	thread: Thread;
	currentThreadId: string | null;
}) => {
	const router = useRouter();
	// State for inline editing
	const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
	const [editingTitle, setEditingTitle] = useState<string>('');
	const [originalTitle, setOriginalTitle] = useState<string>('');

	// React Query mutations with optimistic updates
	const pinThreadMutation = usePinThread();
	const deleteThreadMutation = useDeleteThread();
	const renameThreadMutation = useRenameThread();

	/**
	 * Handle pinning/unpinning a thread
	 */
	const handlePinThread = async (
		threadId: string,
		currentPinned: boolean | undefined
	) => {
		await pinThreadMutation({
			threadId: threadId as Id<'threads'>,
			pinned: !currentPinned,
		});
	};

	/**
	 * Handle deleting a thread
	 */
	const handleDeleteThread = async (threadIdToDelete: string) => {
		// If the currently viewed thread is being deleted, redirect to home
		if (currentThreadId === threadIdToDelete) {
			router.push('/');
		}

		await deleteThreadMutation(threadIdToDelete as Id<'threads'>);
	};

	useEffect(() => {
		setTimeout(() => {
			if (editingThreadId) {
				const input = document.getElementById(
					`thread-title-${editingThreadId}`
				);
				if (input) {
					(input as HTMLInputElement).focus();
				}
			}
		}, 10);
	}, [editingThreadId]);
	/**
	 * Start editing a thread title
	 */
	const startEditing = (threadId: string, currentTitle: string) => {
		setEditingThreadId(threadId);
		setEditingTitle(currentTitle);
		setOriginalTitle(currentTitle);
	};

	/**
	 * Cancel editing and revert to original title
	 */
	const cancelEditing = () => {
		setEditingThreadId(null);
		setEditingTitle('');
		setOriginalTitle('');
	};

	/**
	 * Save the edited title
	 */
	const saveTitle = async () => {
		if (!editingThreadId) return;

		const trimmedTitle = editingTitle.trim();

		// If title is empty after trimming, revert to original
		if (!trimmedTitle) {
			cancelEditing();
			return;
		}

		// If title hasn't changed, just cancel editing
		if (trimmedTitle === originalTitle) {
			cancelEditing();
			return;
		}

		try {
			await renameThreadMutation({
				threadId: editingThreadId as Id<'threads'>,
				newTitle: trimmedTitle,
			});
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
			<ThreadItemContextMenuWrapper
				thread={thread}
				handlePinThread={handlePinThread}
				handleDeleteThread={handleDeleteThread}
				startEditing={startEditing}>
				<div className="flex items-center w-full group/menu-item">
					<SidebarMenuButton
						className="flex-1 min-w-0 cursor-pointer group-hover/menu-item:bg-sidebar-accent focus:bg-sidebar-accent focus-visible:bg-sidebar-accent data-[active=true]:font-normal group-focus-within/menu-item:bg-sidebar-accent group-focus-visible/menu-item:bg-sidebar-accent"
						asChild
						isActive={thread._id === currentThreadId}>
						{editingThreadId === thread._id ? (
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
										onDoubleClick={(e) => {
											startEditing(thread._id, thread.title);
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
						<div className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center justify-center h-full p-1 transition-opacity z-[5] animate-in fade-in-0 duration-200 fade-out-0">
							<Loader
								variant="pulse"
								size="sm"
							/>
						</div>
					)}

					<div
						data-state={
							editingThreadId === thread._id ? 'editing' : 'not-editing'
						}
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
								handlePinThread(thread._id, thread.pinned);
								e.stopPropagation();
								e.preventDefault();
							}}>
							{thread.pinned ? (
								<PinOffIcon className="size-3" />
							) : (
								<PinIcon className="size-3" />
							)}
						</Button>
						<ThreadItemDeleteButton
							thread={thread}
							handleDeleteThread={handleDeleteThread}
						/>
					</div>
				</div>
			</ThreadItemContextMenuWrapper>
		</SidebarMenuItem>
	);
};

const ThreadItemDeleteButton = ({
	thread,
	handleDeleteThread,
}: {
	thread: Thread;
	handleDeleteThread: (threadIdToDelete: string) => void;
}) => {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="size-6 shrink-0 rounded-sm dark:hover:bg-sidebar-accent-foreground/20 cursor-pointer">
					<XIcon className="size-3" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Delete thread?</DialogTitle>
					<DialogDescription className="leading-relaxed">
						Are you sure you want to delete the thread "{thread.title}"?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button
						variant="destructive"
						onClick={() => handleDeleteThread(thread._id)}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const ThreadItemContextMenuWrapper = ({
	children,
	thread,
	handlePinThread,
	handleDeleteThread,
	startEditing,
}: {
	children: React.ReactNode;
	thread: Thread;
	handlePinThread: (
		threadId: string,
		currentPinned: boolean | undefined
	) => void;
	handleDeleteThread: (threadIdToDelete: string) => void;
	startEditing: (threadId: string, currentTitle: string) => void;
}) => {
	const archiveThreadMutation = useArchiveThread();

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem
					onClick={() => handlePinThread(thread._id, thread.pinned)}>
					<PinIcon className="size-3.5" />
					{thread.pinned ? 'Unpin' : 'Pin'}
				</ContextMenuItem>
				<ContextMenuItem
					onClick={(e) => {
						startEditing(thread._id, thread.title);
						e.stopPropagation();
					}}>
					<TextCursorIcon className="size-3.5 text-muted-foreground" />
					Rename
				</ContextMenuItem>
				<ContextMenuItem
					onClick={() =>
						archiveThreadMutation({
							threadId: thread._id,
							archived: !thread.archived,
						})
					}>
					{thread.archived ? (
						<ArchiveRestore className="size-3.5" />
					) : (
						<ArchiveIcon className="size-3.5" />
					)}
					{thread.archived ? 'Unarchive' : 'Archive'}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					onClick={() => handleDeleteThread(thread._id)}
					className="text-rose-500 focus:text-rose-700">
					<TrashIcon className="size-4" />
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
};
