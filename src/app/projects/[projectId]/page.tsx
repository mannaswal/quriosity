'use client';

import { useParams } from 'next/navigation';
import { useProjectData } from '@/hooks/use-projects';
import { Id } from 'convex/_generated/dataModel';
import { ProjectHeader } from '../components/project-header';
import { ProjectAttachmentsGrid } from '../components/project-attachments-grid';
import { ProjectThreadsSection } from '../components/project-threads-section';
import { ProjectBreadcrumbs } from '../components/project-breadcrumbs';
import { ProjectWithAttachments } from '@/lib/types';
import { ProjectUploadButton } from '../components/project-upload-button';

export default function ProjectDetailPage() {
	const params = useParams();
	const projectId = params.projectId as Id<'projects'>;
	const projectData = useProjectData(projectId);

	return (
		<div className="w-full flex flex-col">
			<ProjectBreadcrumbs currentProjectId={projectId} />
			<ProjectHeader projectId={projectId} />
			<ProjectDetailPageContent
				projectId={projectId}
				projectData={projectData}
			/>
		</div>
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
							{isLoading ? 'Loading...' : projectData?.systemPrompt}
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
