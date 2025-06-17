import { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircleIcon, PaperclipIcon, CalendarIcon } from 'lucide-react';
import Link from 'next/link';
interface ProjectCardProps {
	project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
	const createdAt = new Date(project._creationTime);
	const timeAgo = createdAt.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});

	return (
		<Link href={`/projects/${project._id}`}>
			<Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border border-[0.5px] gap-2">
				<CardHeader>
					<CardTitle className="truncate text-xl font-medium">
						{project.name}
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col justify-between h-full gap-4">
					<div className="text-sm text-muted-foreground line-clamp-3">
						{project.systemPrompt || 'No system prompt set'}
					</div>

					<div className="flex items-center gap-4 text-muted-foreground text-xs">
						<div className="flex items-center gap-1">
							<PaperclipIcon className="size-3.5" />
							<span>{project.attachmentIds.length}</span>
						</div>
						<div className="flex items-center gap-1">
							<CalendarIcon className="size-3.5" />
							<span>{timeAgo}</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
