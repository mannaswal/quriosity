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
	PlusIcon,
} from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger, useSidebar } from '../ui/sidebar';
import { ProjectId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

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
				'flex items-center space-x-2 text-sm text-muted-foreground h-16 absolute top-0 left-0 px-6 transition-all duration-75',
				!open && 'pl-24'
			)}>
			<div
				className={cn(
					'z-10 fixed top-4.5 left-4.5 transition-all duration-100 flex items-center pr-1.5',
					open ? 'opacity-0' : 'opacity-100',
					!open && route === 'projects' && 'border-r border-border'
				)}>
				<SidebarTrigger />
				<Link href="/">
					<Button
						variant="ghost"
						size="icon"
						className="size-7 rounded-md">
						<PlusIcon className="size-4" />
					</Button>
				</Link>
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
