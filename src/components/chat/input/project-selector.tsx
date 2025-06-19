import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
	FolderIcon,
	FolderInputIcon,
	FolderOutputIcon,
	FolderXIcon,
} from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import {
	useTempSelectedProjectId,
	useTempActions,
} from '@/stores/use-temp-data-store';
import { Id } from 'convex/_generated/dataModel';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useThread, useUpdateThreadProject } from '@/hooks/use-threads';
import { cn } from '@/lib/utils';
import { ProjectId } from '@/lib/types';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';

export function ProjectSelector() {
	const thread = useThread();
	const projects = useProjects();
	const selectedProjectId = useTempSelectedProjectId();
	const { setSelectedProjectId } = useTempActions();
	const updateThreadProject = useUpdateThreadProject();
	const pathname = usePathname();

	// Auto-select project when on project page
	useEffect(() => {
		if (pathname.startsWith('/projects/')) {
			const projectIdFromPath = pathname.split('/projects/')[1];
			if (projectIdFromPath)
				setSelectedProjectId(projectIdFromPath as Id<'projects'>);
		} else {
			setSelectedProjectId(undefined);
		}
	}, [pathname, setSelectedProjectId]);

	// Determine if we're in existing thread mode
	const isExistingThread = thread || pathname.startsWith('/chat/');

	// Get current project - either from thread or temp selection
	const currentProject = isExistingThread
		? projects?.find((p) => p._id === thread?.projectId)
		: projects?.find((p) => p._id === selectedProjectId);

	// Handler for changing project
	const handleProjectChange = async (value: ProjectId | 'none') => {
		if (isExistingThread) {
			// For existing threads
			if (!thread) return;
			const newProjectId = value === 'none' ? undefined : value;
			await updateThreadProject({
				threadId: thread._id,
				projectId: newProjectId,
			});
		} else {
			// For new chats
			if (value === 'none') {
				setSelectedProjectId(undefined);
			} else {
				setSelectedProjectId(value);
			}
		}
	};

	return (
		<Select
			value={currentProject?._id ?? 'none'}
			onValueChange={handleProjectChange}>
			{currentProject ? (
				<TooltipWrapper
					tooltip={
						<div>
							{isExistingThread ? (
								<>
									This chat is part of{' '}
									<span className="font-medium">{currentProject.name}</span>
									<br />
									<span className="text-xs text-muted-foreground mt-0.5">
										Click to change project
									</span>
								</>
							) : (
								<>
									Selected project:{' '}
									<span className="font-medium">{currentProject.name}</span>
									<br />
									<span className="text-xs text-muted-foreground mt-0.5">
										Click to change project
									</span>
								</>
							)}
						</div>
					}>
					<Button
						variant="ghost"
						size="default"
						className={cn(
							'font-normal h-9 min-w-9 w-auto',
							'border-none not-hover:dark:bg-transparent'
						)}
						asChild>
						<SelectTrigger hideChevron>
							<FolderIcon
								className="size-4.5 shrink-0 -ml-[3px] text-foreground"
								strokeWidth={1}
							/>
							<span className="text-sm max-w-24 truncate">
								{currentProject.name}
							</span>
						</SelectTrigger>
					</Button>
				</TooltipWrapper>
			) : (
				<TooltipWrapper
					disabled={!!projects?.length}
					tooltip={
						!projects?.length ? (
							"You don't have any projects yet"
						) : (
							<div>
								<span>No project assigned</span>
								<br />
								<span className="text-xs text-muted-foreground mt-0.5">
									Click to add to a project
								</span>
							</div>
						)
					}>
					<Button
						disabled={projects?.length === 0}
						variant="ghost"
						size="default"
						className={cn(
							'font-normal h-9 w-9',
							'border-none not-hover:dark:bg-transparent'
						)}
						asChild>
						<SelectTrigger hideChevron>
							<FolderInputIcon
								className="size-4.5 shrink-0 text-foreground!"
								strokeWidth={1}
							/>
						</SelectTrigger>
					</Button>
				</TooltipWrapper>
			)}
			<SelectContent
				align="center"
				className="rounded-lg">
				{projects?.map((project) => (
					<SelectItem
						key={project._id}
						value={project._id}
						className="cursor-pointer">
						<div className="flex items-center gap-2">
							<FolderIcon className="size-3.5" />
							<span>{project.name}</span>
						</div>
					</SelectItem>
				))}
				<SelectSeparator />
				<SelectItem
					value="none"
					className="cursor-pointer">
					{currentProject ? (
						<div className="flex items-center gap-2">
							<FolderOutputIcon className="size-3.5" />
							<span className="text-destructive">Remove</span>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<FolderXIcon className="size-3.5" />
							<span>No project</span>
						</div>
					)}
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
