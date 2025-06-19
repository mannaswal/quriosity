import { Thread } from '@/lib/types';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
	ArchiveIcon,
	ArchiveRestore,
	FolderIcon,
	FolderPlusIcon,
	FolderMinusIcon,
	PinIcon,
	TextCursorIcon,
	TrashIcon,
	FolderInputIcon,
	FolderOutputIcon,
	ShareIcon,
} from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import { useUpdateThreadProject } from '@/hooks/use-threads';
import { Id } from 'convex/_generated/dataModel';
import { TooltipWrapper } from '../ui/tooltip-wrapper';
import { ShareThreadDialog } from './share-thread-dialog';
import { Button } from '../ui/button';
import { useState } from 'react';

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
	const projects = useProjects();
	const updateThreadProject = useUpdateThreadProject();
	const [shareDialogOpen, setShareDialogOpen] = useState(false);

	const handleAddToProject = async (projectId: Id<'projects'>) => {
		await updateThreadProject({ threadId: thread._id, projectId });
	};

	const handleRemoveFromProject = async () => {
		await updateThreadProject({ threadId: thread._id, projectId: undefined });
	};

	const availableProjects =
		projects?.filter((p) => p._id !== thread.projectId) || [];

	const threadProject = projects?.find((p) => p._id === thread.projectId);

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
				<ContextMenuItem onSelect={() => setShareDialogOpen(true)}>
					<ShareIcon className="size-3.5 text-muted-foreground" />
					{thread.isPublic ? 'Manage sharing' : 'Share chat'}
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

				{/* Project Management */}
				{thread.projectId ? (
					<TooltipWrapper
						side="right"
						sideOffset={4}
						tooltip={
							threadProject ? `Remove from ${threadProject.name}` : undefined
						}>
						<ContextMenuItem onClick={handleRemoveFromProject}>
							<FolderOutputIcon className="size-3.5" />
							Remove from project
						</ContextMenuItem>
					</TooltipWrapper>
				) : (
					<ContextMenuSub>
						<TooltipWrapper
							delayDuration={200}
							side="right"
							disabled={availableProjects.length > 0}
							tooltip={
								!availableProjects.length
									? "You don't have any projects yet"
									: undefined
							}>
							<ContextMenuSubTrigger
								className="min-w-40 space-x-2 data-[disabled]:text-muted-foreground data-[disabled]:[&_svg]:last:hidden"
								disabled={availableProjects.length === 0}>
								<FolderInputIcon className="size-3.5 text-muted-foreground" />
								Add to project
							</ContextMenuSubTrigger>
						</TooltipWrapper>
						<ContextMenuSubContent
							sideOffset={8}
							alignOffset={-4}>
							{availableProjects.map((project) => (
								<ContextMenuItem
									key={project._id}
									onClick={() => handleAddToProject(project._id)}>
									<FolderIcon className="size-3.5" />
									{project.name}
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
				)}

				<ContextMenuSeparator />
				<ContextMenuItem
					onClick={handleDeleteThread}
					className="text-destructive focus:text-destructive">
					<TrashIcon className="size-3.5" />
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
			<ShareThreadDialog
				thread={thread}
				open={shareDialogOpen}
				onOpenChange={setShareDialogOpen}
			/>
		</ContextMenu>
	);
};
