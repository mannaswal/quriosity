import { useProjectThreads } from '@/hooks/use-projects';
import { Id } from 'convex/_generated/dataModel';
import { groupThreadsByStatusAndRecency } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { Thread } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
} from '@/components/ui/dialog';
import {
	MessageCircleIcon,
	PinIcon,
	ArchiveIcon,
	ClockIcon,
	MoreHorizontalIcon,
	PinOffIcon,
	ArchiveRestore,
	TrashIcon,
	PencilIcon,
	XIcon,
} from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectThreadsSectionProps {
	projectId: Id<'projects'>;
}

interface ThreadItemProps {
	thread: Thread;
}

function ThreadItem({ thread }: ThreadItemProps) {
	const createdAt = new Date(thread._creationTime);
	const timeAgo = createdAt.toLocaleDateString();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const pinThread = usePinThread();
	const archiveThread = useArchiveThread();
	const deleteThread = useDeleteThread();
	const renameThread = useRenameThread();

	const handlePinThread = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		pinThread({ threadId: thread._id, pinned: !thread.pinned });
	};

	const handleArchiveThread = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		archiveThread({ threadId: thread._id, archived: !thread.archived });
	};

	const handleDeleteThread = () => {
		deleteThread(thread._id);
		setDeleteDialogOpen(false);
	};

	return (
		<div className="group relative">
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<Link href={`/chat/${thread._id}`}>
						<Card className="hover:shadow-sm transition-shadow cursor-pointer p-3 pr-1.5">
							<CardContent className="p-0">
								<div className="flex items-center justify-between group/thread-item">
									<div className="flex-1 min-w-0">
										<h4 className="font-medium truncate">{thread.title}</h4>
									</div>
									<div className="flex items-center group-hover/thread-item:opacity-100 opacity-0 transition-opacity -my-4">
										<Button
											variant="ghost"
											size="icon"
											onClick={handlePinThread}>
											{thread.pinned ? (
												<PinOffIcon className="size-4	" />
											) : (
												<PinIcon className="size-4	" />
											)}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={handleArchiveThread}>
											{thread.archived ? (
												<ArchiveRestore className="size-4	" />
											) : (
												<ArchiveIcon className="size-4	" />
											)}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={(e) => {
												setDeleteDialogOpen(true);
												e.preventDefault();
												e.stopPropagation();
											}}>
											<XIcon className="size-4" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</Link>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem onClick={handlePinThread}>
						{thread.pinned ? (
							<>
								<PinOffIcon className="size-4 mr-2" />
								Unpin
							</>
						) : (
							<>
								<PinIcon className="size-4 mr-2" />
								Pin
							</>
						)}
					</ContextMenuItem>
					<ContextMenuItem onClick={handleArchiveThread}>
						{thread.archived ? (
							<>
								<ArchiveRestore className="size-4 mr-2" />
								Unarchive
							</>
						) : (
							<>
								<ArchiveIcon className="size-4 mr-2" />
								Archive
							</>
						)}
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => setDeleteDialogOpen(true)}
						className="text-red-500 focus:text-red-700">
						<TrashIcon className="size-4 mr-2" />
						Delete
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			<Dialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}>
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
							onClick={handleDeleteThread}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
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

	const groupedThreads = useMemo(() => {
		return groupThreadsByStatusAndRecency(threads);
	}, [threads]);

	if (threads === undefined) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				Loading chats...
			</div>
		);
	}

	if (!threads.length) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				No chats in this project yet
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
