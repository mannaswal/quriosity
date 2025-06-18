import { useProjectThreads } from '@/hooks/use-projects';
import { Id } from 'convex/_generated/dataModel';
import { groupThreadsByStatusAndRecency } from '@/lib/utils';
import { useMemo } from 'react';
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
} from 'lucide-react';
import { DeleteThreadButton } from '../threads/delete-thread-button';
import { ThreadContextMenu } from '../threads/thread-context-menu';

interface ProjectThreadsSectionProps {
	projectId: Id<'projects'>;
}

interface ThreadItemProps {
	thread: Thread;
}

function ThreadItem({ thread }: ThreadItemProps) {
	const pinThread = usePinThread();
	const archiveThread = useArchiveThread();
	const deleteThread = useDeleteThread();
	const renameThread = useRenameThread();

	const handlePinThread = async () => {
		await pinThread({ threadId: thread._id, pinned: !thread.pinned });
	};

	const handleArchiveThread = async () => {
		await archiveThread({ threadId: thread._id, archived: !thread.archived });
	};

	const handleDeleteThread = async () => {
		await deleteThread(thread._id);
	};

	return (
		<div className="group relative">
			<ThreadContextMenu
				thread={thread}
				handlePinThread={handlePinThread}
				handleDeleteThread={handleDeleteThread}
				handleArchiveThread={handleArchiveThread}
				handleRenameOnClick={() => {}}>
				<Card className="hover:shadow-sm transition-shadow cursor-pointer p-0 relative group/thread-item">
					<Link href={`/chat/${thread._id}`}>
						<CardContent className="p-3 pr-1.5">
							<div className="flex items-center justify-between ">
								<div className="flex-1 min-w-0">
									<h4 className="font-medium truncate">{thread.title}</h4>
								</div>
							</div>
						</CardContent>
					</Link>
					<div className="flex items-center group-hover/thread-item:opacity-100 opacity-0 transition-opacity absolute right-1.5 top-0 translate-y-1/2 -mt-3 z-5">
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

	const groupedThreads = useMemo(() => {
		return groupThreadsByStatusAndRecency(threads);
	}, [threads]);

	if (threads === undefined) return null;

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
