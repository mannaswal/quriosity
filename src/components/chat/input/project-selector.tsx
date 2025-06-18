import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FolderIcon } from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import {
	useTempSelectedProjectId,
	useTempActions,
} from '@/stores/use-temp-data-store';
import { Id } from 'convex/_generated/dataModel';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useThread } from '@/hooks/use-threads';
import { cn } from '@/lib/utils';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

export function ProjectSelector() {
	const thread = useThread();
	const projects = useProjects();
	const selectedProjectId = useTempSelectedProjectId();
	const { setSelectedProjectId } = useTempActions();
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

	if (thread || pathname.startsWith('/chat/')) {
		const project = projects?.find((p) => p._id === thread?.projectId);
		if (!project) return null;

		return (
			<Tooltip delayDuration={400}>
				<TooltipTrigger>
					<div className="rounded-md hover:bg-muted/50  px-2.5 h-9 flex items-center gap-2 cursor-default text-muted-foreground animate-in fade-in-0 duration-75">
						<FolderIcon
							className="size-4"
							strokeWidth={1.2}
						/>
						<span className="text-sm">{project.name}</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					This chat is a part of the project{' '}
					<span className="font-medium">{project.name}</span>
				</TooltipContent>
			</Tooltip>
		);
	}

	const selectedProject = projects?.find((p) => p._id === selectedProjectId);

	const handleProjectChange = (value: string) => {
		if (value === 'none') {
			setSelectedProjectId(undefined);
		} else {
			setSelectedProjectId(value as Id<'projects'>);
		}
	};

	return (
		<Select
			value={selectedProject?._id ?? 'none'}
			onValueChange={handleProjectChange}>
			{selectedProject ? (
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
							className="size-4 shrink-0 -ml-0.5 text-foreground"
							strokeWidth={1.2}
						/>
						<span className="text-sm max-w-24 truncate">
							{selectedProject.name}
						</span>
					</SelectTrigger>
				</Button>
			) : (
				<Button
					variant="ghost"
					size="default"
					className={cn(
						'font-normal h-9 w-9',
						'border-none not-hover:dark:bg-transparent'
					)}
					asChild>
					<SelectTrigger hideChevron>
						<FolderIcon
							className="size-4 shrink-0 text-foreground"
							strokeWidth={1.2}
						/>
					</SelectTrigger>
				</Button>
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
							<span>{project.name}</span>
						</div>
					</SelectItem>
				))}
				<SelectItem
					value="none"
					className="cursor-pointer">
					<div className="flex items-center gap-2">
						<span>None</span>
					</div>
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
