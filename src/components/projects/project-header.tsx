import { ProjectWithAttachments } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PencilIcon, TrashIcon } from 'lucide-react';
import { useState } from 'react';
import { ProjectEditDialog } from './project-edit-dialog';
import { Id } from 'convex/_generated/dataModel';
import {
	useDeleteProject,
	useProjectData,
	useProjects,
} from '@/hooks/use-projects';
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface ProjectHeaderProps {
	projectId: Id<'projects'>;
}

export function ProjectHeader({ projectId }: ProjectHeaderProps) {
	const projects = useProjects();
	const project = projects?.find((project) => project._id === projectId);
	const deleteProject = useDeleteProject();

	return (
		<div className="flex items-start justify-between mb-8 h-9">
			<div className="space-y-2">
				<h1 className="text-3xl font-medium">{project?.name}</h1>
			</div>
			<div className="flex items-center gap-2">
				<ProjectEditDialog project={project} />
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant={'outline'}
							size={'icon'}>
							<TrashIcon className="size-4 text-destructive" />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						</AlertDialogHeader>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete this
							project and all its data.
						</AlertDialogDescription>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => deleteProject(projectId)}
								asChild>
								<Button variant={'destructive'}>Delete</Button>
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}
