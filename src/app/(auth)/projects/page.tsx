'use client';

import { useProjects } from '@/hooks/use-projects';
import { ProjectCard } from '../../../components/projects/project-card';
import { Button } from '@/components/ui/button';
import { PlusIcon, FolderIcon } from 'lucide-react';
import { useState } from 'react';
import { ProjectCreateDialog } from '../../../components/projects/project-create-dialog';
import { Project } from '@/lib/types';

export default function ProjectsPage() {
	const projects = useProjects();

	return (
		<div className="w-full flex flex-col gap-8">
			<div className="flex items-start justify-between mb-8">
				<div className="space-y-2">
					<h1 className="text-3xl font-medium">Projects</h1>
					<p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
						Organize your conversations, add attachments and context that
						applies to all conversations in a project
					</p>
				</div>
				<ProjectCreateDialog>
					<Button>
						Create Project
						<PlusIcon className="size-4" />
					</Button>
				</ProjectCreateDialog>
			</div>
			<ProjectsPageContent projects={projects} />
		</div>
	);
}

const ProjectsPageContent = ({
	projects,
}: {
	projects: Project[] | undefined;
}) => {
	if (projects === undefined) return null;

	if (!projects.length)
		return (
			<div className="text-center py-16">
				<div className="text-muted-foreground mb-4">
					You haven't created any projects yet
				</div>
				<ProjectCreateDialog>
					<Button>
						<PlusIcon className="size-4 mr-2" />
						Create your first project
					</Button>
				</ProjectCreateDialog>
			</div>
		);

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			{projects.map((project) => (
				<ProjectCard
					key={project._id}
					project={project}
				/>
			))}
		</div>
	);
};
