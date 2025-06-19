'use client';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	FolderIcon,
	PlusIcon,
	ShareIcon,
	UsersIcon,
} from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import { useThread } from '@/hooks/use-threads';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger, useSidebar } from '../ui/sidebar';
import { ProjectId, Thread } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { TooltipWrapper } from '../ui/tooltip-wrapper';
import { Kbd } from '../ui/kbd';
import { ShareThreadDialog } from '../threads/share-thread-dialog';
import { useState } from 'react';

const getRouteData = (
	pathname: string
): ['projects' | 'chat', ...string[]] | null => {
	const pathParts = pathname.split('/');
	const routeName = pathParts[1];

	if (routeName === 'projects') {
		return ['projects', ...pathParts.slice(2)];
	}

	if (routeName === 'chat') {
		return ['chat', ...pathParts.slice(2)];
	}

	return null;
};

export function AppBreadcrumbs() {
	const pathname = usePathname();
	const { open } = useSidebar();

	const routeData = getRouteData(pathname);

	const route = routeData?.[0];

	return (
		<nav
			className={cn(
				'w-full flex items-center space-x-2 text-sm text-muted-foreground h-16 absolute top-0 left-0 pl-6 pr-3 transition-all duration-75',
				!open && 'pl-32'
			)}>
			<div
				className={cn(
					'fixed top-4.5 left-4.5 transition-all duration-100 flex items-center z-30 w-24',
					!open && route === 'projects' && 'border-r border-border'
				)}>
				<TooltipWrapper
					tooltip={
						<>
							Toggle sidebar
							<Kbd>⌘</Kbd>
							<Kbd>B</Kbd>
						</>
					}>
					<SidebarTrigger
						className={cn('transition-colors', open && 'text-foreground')}
					/>
				</TooltipWrapper>
				<div
					className={cn(
						'z-30 absolute top-0 left-7 transition-all duration-200 ease-out',
						open && 'text-foreground left-48'
					)}>
					<TooltipWrapper
						tooltip={
							<>
								New chat
								<Kbd>⌘</Kbd>
								<Kbd>shift</Kbd>
								<Kbd>O</Kbd>
							</>
						}>
						<Button
							variant="ghost"
							size="icon"
							className={cn('size-7 rounded-md')}
							asChild>
							<Link href="/">
								<PlusIcon className="size-4" />
							</Link>
						</Button>
					</TooltipWrapper>
				</div>
				<div className="z-10 absolute top-0 left-14 transition-all duration-100">
					<TooltipWrapper tooltip="Projects">
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								'size-7 rounded-md z-10 transition-all duration-100',
								open && 'opacity-0'
							)}
							asChild>
							<Link href="/projects">
								<FolderIcon className="size-4" />
							</Link>
						</Button>
					</TooltipWrapper>
				</div>
			</div>
			{route === 'projects' && (
				<>
					<Link
						href="/projects"
						className="hover:text-foreground">
						Projects
					</Link>
					<ProjectBreadcrumb projectId={routeData?.[1]} />
				</>
			)}
			{route === 'chat' && <ManageSharingButton />}
		</nav>
	);
}

const ProjectBreadcrumb = ({
	projectId,
}: {
	projectId: string | undefined;
}) => {
	const projects = useProjects();
	const project = projects?.find((project) => project._id === projectId);

	if (!projects || !projectId) return null;

	return (
		<>
			<ChevronRightIcon className="size-4" />
			<DropdownMenu>
				<DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground cursor-pointer">
					{project?.name || 'Untitled'}
					<ChevronDownIcon className="size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{projects?.map((project) => (
						<DropdownMenuItem
							className="cursor-pointer"
							key={project._id}
							asChild>
							<Link href={`/projects/${project._id}`}>{project.name}</Link>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};

const ManageSharingButton = () => {
	const thread = useThread();
	const [shareDialogOpen, setShareDialogOpen] = useState(false);

	if (!thread || !thread.isPublic) return null;

	return (
		<div className="ml-auto z-30">
			<TooltipWrapper tooltip="Manage sharing">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setShareDialogOpen(true)}>
					<UsersIcon className="size-4 text-foreground" />
				</Button>
			</TooltipWrapper>
			<ShareThreadDialog
				thread={thread}
				open={shareDialogOpen}
				onOpenChange={setShareDialogOpen}
			/>
		</div>
	);
};
