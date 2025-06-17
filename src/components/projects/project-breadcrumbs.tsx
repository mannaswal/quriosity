import { ProjectWithAttachments } from '@/lib/types';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import Link from 'next/link';

interface ProjectBreadcrumbsProps {
	currentProjectId: string;
}

export function ProjectBreadcrumbs({
	currentProjectId,
}: ProjectBreadcrumbsProps) {
	const projects = useProjects();

	const currentProject = projects?.find(
		(project) => project._id === currentProjectId
	);

	return (
		<nav className="flex items-center space-x-2 text-sm text-muted-foreground h-16 absolute top-0 left-0 px-6">
			<Link
				href="/projects"
				className="hover:text-foreground">
				Projects
			</Link>
			<ChevronRightIcon className="size-4" />
			<DropdownMenu>
				<DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground cursor-pointer">
					{currentProject?.name}
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
		</nav>
	);
}
