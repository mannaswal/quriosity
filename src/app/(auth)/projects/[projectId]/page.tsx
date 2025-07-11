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
import { Loading } from '@/components/layout/loading';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { useTempActions } from '@/stores/use-temp-data-store';
import Link from 'next/link';

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
		// return <Loading message="Loading project..." />;
		return null;
	}

	// Don't render if project data is null (will redirect)
	if (projectData === null) {
		return null;
	}

	return (
		<ConvexErrorBoundary context="project">
			<div className="w-full flex flex-col fade-in animate-in">
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
	const { setSelectedProjectId } = useTempActions();

	return (
		<section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
			<div className="">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold">Chats</h2>
					<TooltipWrapper
						side="bottom"
						tooltip="Start a new chat with this project">
						<Button
							variant={'outline'}
							size={'icon'}
							className="size-8"
							onClick={() => {
								setSelectedProjectId(projectId);
							}}
							asChild>
							<Link href="/">
								<PlusIcon className="size-4" />
							</Link>
						</Button>
					</TooltipWrapper>
				</div>
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
