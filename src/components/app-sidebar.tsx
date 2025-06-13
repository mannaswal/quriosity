'use client';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenuItem,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuAction,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { Authenticated, Unauthenticated, useConvexAuth } from 'convex/react';
import { SignInButton, UserButton } from '@clerk/nextjs';
import { useStoreUserEffect } from '@/hooks/use-store-user';
import {
	useThreads,
	usePinThread,
	useDeleteThread,
	useRenameThread,
} from '@/hooks/use-threads';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
	DeleteIcon,
	EllipsisVerticalIcon,
	PinIcon,
	PinOffIcon,
	SplitIcon,
	TextCursorIcon,
	TrashIcon,
	XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Thread } from '@/lib/types';

import { useMemo } from 'react';
import { TextShimmer } from './ui/text-shimmer';
import { Loader } from './ui/loader';
import { Id } from 'convex/_generated/dataModel';

/**
 * Helper function to group threads by pinned status and recency.
 * Returns an object with keys: pinned, today, yesterday, last7Days, last30Days.
 */
function groupThreadsByRecency(threads: Thread[] | undefined) {
	if (!threads)
		return {
			pinned: [],
			today: [],
			yesterday: [],
			last7Days: [],
			last30Days: [],
		};

	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate()
	);

	const startOfYesterday = new Date(startOfToday);
	startOfYesterday.setDate(startOfToday.getDate() - 1);
	const startOf7DaysAgo = new Date(startOfToday);
	startOf7DaysAgo.setDate(startOfToday.getDate() - 6); // includes today
	const startOf30DaysAgo = new Date(startOfToday);
	startOf30DaysAgo.setDate(startOfToday.getDate() - 29); // includes today

	const groups = {
		pinned: [] as Thread[],
		today: [] as Thread[],
		yesterday: [] as Thread[],
		last7Days: [] as Thread[],
		last30Days: [] as Thread[],
	};

	for (const thread of threads) {
		if (thread.pinned) {
			groups.pinned.push(thread);
			continue;
		}
		const createdAt = new Date(thread._creationTime);

		if (createdAt >= startOfToday) {
			groups.today.push(thread);
		} else if (createdAt >= startOfYesterday && createdAt < startOfToday) {
			groups.yesterday.push(thread);
		} else if (createdAt >= startOf7DaysAgo && createdAt < startOfYesterday) {
			groups.last7Days.push(thread);
		} else if (createdAt >= startOf30DaysAgo && createdAt < startOf7DaysAgo) {
			groups.last30Days.push(thread);
		}
	}
	return groups;
}

/**
 * AppSidebar component with threads grouped by pinned, today, yesterday, last 7 days, last 30 days.
 */
export function AppSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const threadId = pathname.includes('/chat/')
		? pathname.split('/chat/')[1]
		: null;
	const { isAuthenticated, isLoading } = useConvexAuth();

	useStoreUserEffect();

	const threads = useThreads();

	const groupedThreads = useMemo(() => {
		return groupThreadsByRecency(threads);
	}, [threads]);

	const sidebarGroups = [
		{ name: 'Pinned', threads: groupedThreads.pinned },
		{ name: 'Today', threads: groupedThreads.today },
		{ name: 'Yesterday', threads: groupedThreads.yesterday },
		{ name: 'Last 7 Days', threads: groupedThreads.last7Days },
		{ name: 'Last 30 Days', threads: groupedThreads.last30Days },
	];

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.shiftKey &&
				e.key.toLowerCase() === 'o'
			) {
				e.preventDefault();
				router.push('/');
			}
		};
		window.addEventListener('keydown', handler);
		return () => {
			window.removeEventListener('keydown', handler);
		};
	}, [router]);

	return (
		<Sidebar variant="floating">
			<SidebarHeader>
				<Link href="/">
					<h1 className="text-2xl font-medium p-2 tracking-tight">Quriosity</h1>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				{isLoading ? (
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								<div className="text-sm text-muted-foreground">Loading...</div>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				) : isAuthenticated ? (
					!threads || threads.length === 0 ? (
						<SidebarGroup>
							<SidebarGroupContent>
								<SidebarMenu>
									<div className="text-sm text-muted-foreground">
										No conversations yet
									</div>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					) : (
						<>
							{sidebarGroups.map((group) => {
								if (group.threads.length === 0) return null;
								return (
									<SidebarGroup key={group.name}>
										<SidebarGroupLabel>{group.name}</SidebarGroupLabel>
										<SidebarGroupContent>
											<SidebarMenu>
												{group.threads.map((thread) => (
													<ThreadItem
														key={thread._id}
														thread={thread}
														currentThreadId={threadId}
													/>
												))}
											</SidebarMenu>
										</SidebarGroupContent>
									</SidebarGroup>
								);
							})}
						</>
					)
				) : (
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								<div className="text-sm text-muted-foreground">
									Sign in to view conversations
								</div>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}
			</SidebarContent>
			<SidebarFooter>
				<Authenticated>
					<UserButton />
				</Authenticated>
				<Unauthenticated>
					<SignInButton />
				</Unauthenticated>
			</SidebarFooter>
		</Sidebar>
	);
}

/**
 * Individual thread item component with all thread-related functionality
 */
const ThreadItem = ({
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
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div className="flex items-center w-full">
						<SidebarMenuButton
							className="flex-1 min-w-0 cursor-pointer group-hover/menu-item:bg-sidebar-accent data-[active=true]:font-normal"
							asChild
							isActive={thread._id === currentThreadId}>
							<Link
								href={`/chat/${thread._id}`}
								className="text-sm hover:text-foreground transition-colors flex-1 min-w-0">
								{editingThreadId === thread._id ? (
									<input
										type="text"
										value={editingTitle}
										onChange={(e) => setEditingTitle(e.target.value)}
										onBlur={saveTitle}
										onKeyDown={handleKeyPress}
										className="bg-transparent border-none outline-none text-sm w-full min-w-0 focus:ring-0 focus:outline-none"
										autoFocus
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
									/>
								) : (
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
								)}
							</Link>
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
								'group-hover/menu-item:opacity-100 opacity-0',
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
							<Button
								variant="ghost"
								size="icon"
								className="size-6 shrink-0 rounded-sm dark:hover:bg-sidebar-accent-foreground/20 cursor-pointer"
								onClick={(e) => {
									handleDeleteThread(thread._id);
									e.preventDefault();
									e.stopPropagation();
								}}>
								<XIcon className="size-3" />
							</Button>
						</div>
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem
						onClick={() => handlePinThread(thread._id, thread.pinned)}>
						<PinIcon className="mr-2 size-4" />
						{thread.pinned ? 'Unpin' : 'Pin'}
					</ContextMenuItem>
					<ContextMenuItem
						onClick={(e) => {
							startEditing(thread._id, thread.title);
							// e.preventDefault();
							e.stopPropagation();
						}}>
						<TextCursorIcon className="mr-2 size-4" />
						Rename
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => handleDeleteThread(thread._id)}
						className="text-red-500 focus:text-red-700">
						<TrashIcon className="mr-2 size-4" />
						Delete
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		</SidebarMenuItem>
	);
};
