'use client';

import {
	useQuery as useConvexQuery,
	useMutation as useConvexMutation,
	useConvexAuth,
} from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { Project, ProjectWithAttachments } from '@/lib/types';

/**
 * Hook to get all user projects
 */
export function useProjects() {
	const { isAuthenticated } = useConvexAuth();

	return useConvexQuery(
		api.projects.getUserProjects,
		isAuthenticated ? {} : 'skip'
	);
}

/**
 * Hook to get a specific project by ID
 */
export function useProject(projectId: Id<'projects'> | undefined) {
	const { isAuthenticated } = useConvexAuth();

	return useConvexQuery(
		api.projects.getProjectById,
		projectId && isAuthenticated ? { projectId } : 'skip'
	);
}

/**
 * Hook to get a specific project data by ID
 */
export function useProjectData(projectId: Id<'projects'> | undefined) {
	const { isAuthenticated } = useConvexAuth();

	return useConvexQuery(
		api.projects.getProjectDataById,
		projectId && isAuthenticated ? { projectId } : 'skip'
	);
}

/**
 * Hook to get project data by thread ID (includes attachments)
 */
export function useProjectDataByThreadId(threadId: Id<'threads'> | undefined) {
	const { isAuthenticated } = useConvexAuth();

	return (
		useConvexQuery(
			api.projects.getProjectDataByThreadId,
			threadId && isAuthenticated ? { threadId } : 'skip'
		) ?? undefined
	);
}

/**
 * Hook to get threads that belong to a specific project
 */
export function useProjectThreads(projectId: Id<'projects'> | undefined) {
	const { isAuthenticated } = useConvexAuth();

	return useConvexQuery(
		api.projects.getProjectThreads,
		projectId && isAuthenticated ? { projectId } : 'skip'
	);
}

/**
 * Hook for creating a new project
 */
export function useCreateProject() {
	const createMutation = useConvexMutation(
		api.projects.createProject
	).withOptimisticUpdate((localStore, args) => {
		const { name, systemPrompt } = args;

		// Optimistically add the new project to the list
		const projectsList = localStore.getQuery(api.projects.getUserProjects, {});
		if (projectsList) {
			const optimisticProject: Project = {
				_id: `temp-${Date.now()}` as Id<'projects'>, // Temporary ID
				_creationTime: Date.now(),
				userId: 'temp' as Id<'users'>, // Will be replaced
				name,
				systemPrompt,
				attachmentIds: [],
			};
			localStore.setQuery(api.projects.getUserProjects, {}, [
				optimisticProject,
				...projectsList,
			]);
		}
	});

	return async (args: { name: string; systemPrompt: string }) => {
		try {
			const projectId = await createMutation(args);
			toast.success('Project created successfully!');
			return projectId;
		} catch (error) {
			toast.error('Failed to create project');
			throw error;
		}
	};
}

/**
 * Hook for updating a project's name and/or system prompt
 */
export function useUpdateProject() {
	const updateMutation = useConvexMutation(
		api.projects.updateProject
	).withOptimisticUpdate((localStore, args) => {
		const { projectId, name, systemPrompt } = args;

		// Update specific project
		const currentProject = localStore.getQuery(api.projects.getProjectById, {
			projectId,
		});
		if (currentProject) {
			localStore.setQuery(
				api.projects.getProjectById,
				{ projectId },
				{
					...currentProject,
					...(name !== undefined && { name }),
					...(systemPrompt !== undefined && { systemPrompt }),
				}
			);
		}

		// Update projects list
		const projectsList = localStore.getQuery(api.projects.getUserProjects, {});
		if (projectsList) {
			const updatedList = projectsList.map((project) =>
				project._id === projectId
					? {
							...project,
							...(name !== undefined && { name }),
							...(systemPrompt !== undefined && { systemPrompt }),
					  }
					: project
			);
			localStore.setQuery(api.projects.getUserProjects, {}, updatedList);
		}
	});

	return async (args: {
		projectId: Id<'projects'>;
		name?: string;
		systemPrompt?: string;
	}) => {
		try {
			await updateMutation(args);
			toast.success('Project updated successfully!');
		} catch (error) {
			toast.error('Failed to update project');
			throw error;
		}
	};
}

/**
 * Hook for deleting a project
 */
export function useDeleteProject() {
	const deleteMutation = useConvexMutation(
		api.projects.deleteProject
	).withOptimisticUpdate((localStore, args) => {
		const { projectId } = args;

		// Remove from projects list
		const projectsList = localStore.getQuery(api.projects.getUserProjects, {});
		if (projectsList) {
			const updatedList = projectsList.filter(
				(project) => project._id !== projectId
			);
			localStore.setQuery(api.projects.getUserProjects, {}, updatedList);
		}

		// The individual project query will naturally become undefined when deleted
		// Clear project threads as well since they're orphaned
		const projectThreads = localStore.getQuery(api.projects.getProjectThreads, {
			projectId,
		});
		if (projectThreads) {
			localStore.setQuery(api.projects.getProjectThreads, { projectId }, []);
		}
	});

	return async (projectId: Id<'projects'>) => {
		try {
			await deleteMutation({ projectId });
			toast.success('Project deleted successfully!');
		} catch (error) {
			toast.error('Failed to delete project');
			throw error;
		}
	};
}

/**
 * Hook for adding an attachment to a project
 */
export function useAddProjectAttachment() {
	const addMutation = useConvexMutation(
		api.projects.addProjectAttachment
	).withOptimisticUpdate((localStore, args) => {
		const { projectId, attachmentId } = args;

		// Update specific project
		const currentProject = localStore.getQuery(api.projects.getProjectById, {
			projectId,
		});
		if (currentProject) {
			localStore.setQuery(
				api.projects.getProjectById,
				{ projectId },
				{
					...currentProject,
					attachmentIds: [...currentProject.attachmentIds, attachmentId],
				}
			);
		}

		// Update projects list
		const projectsList = localStore.getQuery(api.projects.getUserProjects, {});
		if (projectsList) {
			const updatedList = projectsList.map((project) =>
				project._id === projectId
					? {
							...project,
							attachmentIds: [...project.attachmentIds, attachmentId],
					  }
					: project
			);
			localStore.setQuery(api.projects.getUserProjects, {}, updatedList);
		}
	});

	return async (args: {
		projectId: Id<'projects'>;
		attachmentId: Id<'attachments'>;
	}) => {
		try {
			await addMutation(args);
			toast.success('Attachment added to project!');
		} catch (error) {
			toast.error('Failed to add attachment to project');
			throw error;
		}
	};
}

/**
 * Hook for removing an attachment from a project
 */
export function useRemoveProjectAttachment() {
	const removeMutation = useConvexMutation(
		api.projects.removeProjectAttachment
	).withOptimisticUpdate((localStore, args) => {
		const { projectId, attachmentId } = args;

		// Update specific project
		const currentProject = localStore.getQuery(api.projects.getProjectById, {
			projectId,
		});
		if (currentProject) {
			localStore.setQuery(
				api.projects.getProjectById,
				{ projectId },
				{
					...currentProject,
					attachmentIds: currentProject.attachmentIds.filter(
						(id) => id !== attachmentId
					),
				}
			);
		}

		// Update projects list
		const projectsList = localStore.getQuery(api.projects.getUserProjects, {});
		if (projectsList) {
			const updatedList = projectsList.map((project) =>
				project._id === projectId
					? {
							...project,
							attachmentIds: project.attachmentIds.filter(
								(id) => id !== attachmentId
							),
					  }
					: project
			);
			localStore.setQuery(api.projects.getUserProjects, {}, updatedList);
		}
	});

	return async (args: {
		projectId: Id<'projects'>;
		attachmentId: Id<'attachments'>;
	}) => {
		try {
			await removeMutation(args);
			toast.success('Attachment removed from project!');
		} catch (error) {
			toast.error('Failed to remove attachment from project');
			throw error;
		}
	};
}
