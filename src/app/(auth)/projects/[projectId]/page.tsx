'use client';

import { redirect, useParams } from 'next/navigation';
import { useProjectData } from '@/hooks/use-projects';
import { Id } from 'convex/_generated/dataModel';
import { ProjectHeader } from '@/components/projects/project-header';
import { ProjectAttachmentsGrid } from '@/components/projects/project-attachments-grid';
import { ProjectThreadsSection } from '@/components/projects/project-threads-section';
import { ProjectWithAttachments } from '@/lib/types';
import { ProjectUploadButton } from '@/components/projects/project-upload-button';
import { ConvexErrorBoundary } from '@/components/error/convex-error-boundary';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
	const params = useParams();
	const router = useRouter();
	const projectId = params.projectId as Id<'projects'>;
	const projectData = useProjectData(projectId);

	// Enhanced error handling for project access
	useEffect(() => {
		if (projectData === null) {
			toast.error('Project not found or you do not have access to it');
			router.push('/projects');
		}
	}, [projectData, router]);

	// Show loading state while project data is being fetched
	if (projectData === undefined) {
		return (
			<div className="w-full flex flex-col">
				<div className="animate-pulse space-y-4">
					<div className="h-8 bg-muted rounded w-1/3"></div>
					<div className="h-4 bg-muted rounded w-2/3"></div>
				</div>
			</div>
		);
	}

	// Don't render if project data is null (will redirect)
	if (projectData === null) {
		return null;
	}

	return (
		<ConvexErrorBoundary context="project">
			<div className="w-full flex flex-col">
				{/* <ProjectBreadcrumbs currentProjectId={projectId} /> */}
				<ProjectHeader projectId={projectId} />
				<ProjectDetailPageContent
					projectId={projectId}
					projectData={projectData}
				/>
			</div>
		</ConvexErrorBoundary>
	);
}

const ProjectDetailPageContent = ({
	projectId,
	projectData,
}: {
	projectId: Id<'projects'>;
	projectData: ProjectWithAttachments | undefined;
}) => {
	const isLoading = projectData === undefined;
	return (
		<section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
			<div className="">
				<h2 className="text-xl font-semibold mb-4">Chats</h2>
				<ProjectThreadsSection projectId={projectId} />
			</div>
			<section className="space-y-8">
				<div>
					<h2 className="text-xl font-semibold mb-4">Project knowledge</h2>
					<div className="max-h-36 min-h-20 truncate relative">
						<p className="text-sm whitespace-pre-wrap dark:prose-invert text-muted-foreground truncate">
							{isLoading ? null : projectData?.systemPrompt}
						</p>
					</div>
				</div>
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-semibold">Project files</h2>
						<ProjectUploadButton projectId={projectId} />
					</div>
					<ProjectAttachmentsGrid project={projectData} />
				</div>
			</section>
		</section>
	);
};
