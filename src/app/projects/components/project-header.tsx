import { ProjectWithAttachments } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { ProjectEditDialog } from './project-edit-dialog';
import { Id } from 'convex/_generated/dataModel';
import { useProjectData, useProjects } from '@/hooks/use-projects';

interface ProjectHeaderProps {
	projectId: Id<'projects'>;
}

export function ProjectHeader({ projectId }: ProjectHeaderProps) {
	const projects = useProjects();
	const project = projects?.find((project) => project._id === projectId);

	return (
		<div className="flex items-start justify-between mb-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-medium">
					{project?.name || 'Project not found'}
				</h1>
			</div>
			{project && <ProjectEditDialog project={project} />}
		</div>
	);
}
