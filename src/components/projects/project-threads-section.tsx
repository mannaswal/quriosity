import { useProjectThreads } from '@/hooks/use-projects';
import { Id } from 'convex/_generated/dataModel';
import { groupThreadsByStatusAndRecency } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { Thread } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
	usePinThread,
	useArchiveThread,
	useDeleteThread,
	useRenameThread,
} from '@/hooks/use-threads';
import {
	PinIcon,
	ArchiveIcon,
	PinOffIcon,
	ArchiveRestore,
	XIcon,
	PlusIcon,
} from 'lucide-react';
import { DeleteThreadButton } from '../threads/delete-thread-button';
import { ThreadContextMenu } from '../threads/thread-context-menu';
import { useTempActions } from '@/stores/use-temp-data-store';

interface ProjectThreadsSectionProps {
	projectId: Id<'projects'>;
}

interface ThreadItemProps {
	thread: Thread;
}

function ThreadItem({ thread }: ThreadItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editingTitle, setEditingTitle] = useState<string>('');

	const pinThread = usePinThread();
	const archiveThread = useArchiveThread();
	const deleteThread = useDeleteThread();
	const renameThread = useRenameThread();

	const threadId = thread._id;

	const handlePinThread = async () => {
		await pinThread({ threadId: thread._id, pinned: !thread.pinned });
	};

	const handleArchiveThread = async () => {
		await archiveThread({ threadId: thread._id, archived: !thread.archived });
	};

	const handleDeleteThread = async () => {
		await deleteThread(thread._id);
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

	return (
		<div className="group relative">
			<ThreadContextMenu
				thread={thread}
				handlePinThread={handlePinThread}
				handleDeleteThread={handleDeleteThread}
				handleArchiveThread={handleArchiveThread}
				handleRenameOnClick={handleRenameOnClick}>
				<Card className="hover:shadow-sm transition-shadow p-0 relative group/thread-item overflow-hidden">
					{isEditing ? (
						<CardContent className="p-3 pr-1.5 cursor-default">
							<div className="flex items-center justify-between">
								<div className="flex-1 min-w-0">
									<input
										type="text"
										id={`thread-title-${thread._id}`}
										value={editingTitle}
										onChange={(e) => setEditingTitle(e.target.value)}
										onBlur={saveTitle}
										onKeyDown={handleKeyPress}
										className="bg-transparent border-none outline-none font-medium w-full min-w-0 focus:ring-0 focus:outline-none cursor-text"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
									/>
								</div>
							</div>
						</CardContent>
					) : (
						<Link
							href={`/chat/${thread._id}`}
							className="cursor-pointer">
							<CardContent className="p-3 pr-1.5">
								<div className="flex items-center justify-between">
									<div className="flex-1 min-w-0">
										<h4 className="font-medium truncate opacity-0">
											{thread.title}
										</h4>
									</div>
								</div>
							</CardContent>
						</Link>
					)}
					{!isEditing && (
						<div className="flex items-center justify-between absolute inset-0 left-3">
							<div className="w-fit whitespace-nowrap truncate">
								<span
									className="font-medium truncate"
									onDoubleClick={handleRenameOnClick}>
									{thread.title}
								</span>
							</div>
						</div>
					)}
					<div
						data-state={isEditing ? 'editing' : 'not-editing'}
						className="flex items-center focus-within:opacity-100 group-hover/thread-item:opacity-100 opacity-0 transition-opacity absolute right-0 top-1/2 -translate-y-1/2 z-5 data-[state=editing]:hidden focus-within:bg-card hover:bg-card rounded-lg h-full px-1.5">
						<Button
							variant="ghost"
							size="icon"
							onClick={(e) => {
								e.stopPropagation();
								handlePinThread();
							}}>
							{thread.pinned ? (
								<PinOffIcon className="size-4	" />
							) : (
								<PinIcon className="size-4	" />
							)}
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={(e) => {
								e.stopPropagation();
								handleArchiveThread();
							}}>
							{thread.archived ? (
								<ArchiveRestore className="size-4	" />
							) : (
								<ArchiveIcon className="size-4	" />
							)}
						</Button>
						<DeleteThreadButton
							thread={thread}
							handleDeleteThread={handleDeleteThread}
							inside="projects"
						/>
					</div>
				</Card>
			</ThreadContextMenu>
		</div>
	);
}

interface ThreadGroupProps {
	title: string;
	threads: Thread[];
	count?: number;
}

function ThreadGroup({ title, threads, count }: ThreadGroupProps) {
	if (!threads.length) return null;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
				{count !== undefined && (
					<Badge
						variant="secondary"
						className="text-xs -my-1">
						{count}
					</Badge>
				)}
			</div>
			<div className="space-y-2">
				{threads.map((thread) => (
					<ThreadItem
						key={thread._id}
						thread={thread}
					/>
				))}
			</div>
		</div>
	);
}

export function ProjectThreadsSection({
	projectId,
}: ProjectThreadsSectionProps) {
	const threads = useProjectThreads(projectId);
	const { setSelectedProjectId } = useTempActions();

	const groupedThreads = useMemo(() => {
		return groupThreadsByStatusAndRecency(threads);
	}, [threads]);

	if (threads === undefined) return null;

	if (!threads.length) {
		return (
			<div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-3">
				No chats in this project yet
				<Button
					className="w-fit"
					asChild>
					<Link
						href="/"
						onClick={() => setSelectedProjectId(projectId)}>
						<PlusIcon className="size-4" />
						Start a new chat
					</Link>
				</Button>
			</div>
		);
	}

	const threadGroups = [
		{ name: 'Pinned', threads: groupedThreads.pinned },
		{ name: 'Today', threads: groupedThreads.today },
		{ name: 'Yesterday', threads: groupedThreads.yesterday },
		{ name: 'Last 7 Days', threads: groupedThreads.last7Days },
		{ name: 'Last 30 Days', threads: groupedThreads.last30Days },
		{
			name: 'Archived',
			threads: groupedThreads.archived,
			count: groupedThreads.archived.length,
		},
	];

	return (
		<div className="space-y-6">
			{threadGroups.map((group) => (
				<ThreadGroup
					key={group.name}
					title={group.name}
					threads={group.threads}
					count={group.count}
				/>
			))}
		</div>
	);
}
