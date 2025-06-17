import { ProjectWithAttachments } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	FileIcon,
	ImageIcon,
	FileTextIcon,
	XIcon,
	ArrowUpRightIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useRemoveProjectAttachment } from '@/hooks/use-projects';
import { useState } from 'react';
import { Id } from 'convex/_generated/dataModel';
import { ProjectUploadButton } from '../../app/(auth)/projects/components/project-upload-button';
import Link from 'next/link';

interface ProjectAttachmentsGridProps {
	project: ProjectWithAttachments | undefined;
}

export function ProjectAttachmentsGrid({
	project,
}: ProjectAttachmentsGridProps) {
	const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
	const removeAttachment = useRemoveProjectAttachment();

	const handleRemoveAttachment = async (attachmentId: Id<'attachments'>) => {
		if (!project) return;

		setRemovingIds((prev) => new Set(prev).add(attachmentId));
		try {
			await removeAttachment({
				projectId: project._id,
				attachmentId: attachmentId,
			});
		} catch (error) {
			console.error('Failed to remove attachment:', error);
		} finally {
			setRemovingIds((prev) => {
				const newSet = new Set(prev);
				newSet.delete(attachmentId);
				return newSet;
			});
		}
	};

	if (!project) return <div>Loading...</div>;

	if (project.attachments.length === 0) {
		return (
			<div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
				<div className="max-w-sm mx-auto">
					<FileIcon className="size-12 mx-auto text-muted-foreground/50 mb-3" />
					<p className="text-muted-foreground mb-2">No attachments yet</p>
					<p className="text-sm text-muted-foreground/80">
						Project attachments will be available to all conversations in this
						project
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-3 gap-3">
			{project.attachments.map((attachment) => (
				<div
					key={attachment._id}
					className="group relative hover:shadow-md transition-shadow py-0">
					<div className="p-0">
						<div className="aspect-square relative mb-2 bg-muted/50 rounded-xl overflow-hidden">
							{attachment.type === 'image' && attachment.url ? (
								<Image
									src={attachment.url}
									alt={attachment.filename}
									fill
									className="object-cover"
									sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
								/>
							) : (
								<div className="flex items-center justify-center h-full">
									{attachment.type === 'pdf' ? (
										<FileTextIcon className="size-12 text-muted-foreground stroke-1" />
									) : attachment.type === 'text' ? (
										<FileTextIcon className="size-12 text-muted-foreground stroke-1" />
									) : (
										<FileIcon className="size-12 text-muted-foreground stroke-1" />
									)}
								</div>
							)}

							<div className="absolute top-2 right-2 flex gap-1">
								<Button
									variant="secondary"
									size="icon"
									className="opacity-0 group-hover:opacity-100 transition-opacity size-6">
									<Link
										href={attachment.url}
										target="_blank">
										<ArrowUpRightIcon className="size-3" />
									</Link>
								</Button>
								<Button
									variant="secondary"
									size="icon"
									className="opacity-0 group-hover:opacity-100 transition-opacity size-6"
									onClick={() => handleRemoveAttachment(attachment._id)}
									disabled={removingIds.has(attachment._id)}>
									<XIcon className="size-3" />
								</Button>
							</div>
						</div>

						<div>
							<p
								className="text-sm font-medium truncate"
								title={attachment.filename}>
								{attachment.filename}
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								{attachment.type.toUpperCase()}
							</p>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
