import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUpdateProject } from '@/hooks/use-projects';
import { Project, ProjectWithAttachments } from '@/lib/types';
import { DialogClose, DialogTrigger } from '@radix-ui/react-dialog';
import { PencilIcon } from 'lucide-react';

interface ProjectEditDialogProps {
	project: Project | undefined;
}

export function ProjectEditDialog({ project }: ProjectEditDialogProps) {
	const [name, setName] = useState(project?.name);
	const [systemPrompt, setSystemPrompt] = useState(project?.systemPrompt);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const updateProject = useUpdateProject();

	// Reset form when project changes or dialog opens
	useEffect(() => {
		if (isOpen) {
			setName(project?.name);
			setSystemPrompt(project?.systemPrompt);
		}
	}, [project, isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		if (!project) return;
		e.preventDefault();
		if (!name?.trim()) return;

		setIsLoading(true);
		try {
			await updateProject({
				projectId: project._id,
				name: name.trim(),
				systemPrompt: systemPrompt?.trim(),
			});

			setIsOpen(false);
		} catch (error) {
			console.error('Failed to update project:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!isLoading) {
			setIsOpen(newOpen);
		}
	};

	const hasChanges =
		name?.trim() !== project?.name ||
		systemPrompt?.trim() !== project?.systemPrompt;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<PencilIcon className="size-3.5" />
					Edit Project
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl w-full">
				<DialogHeader>
					<DialogTitle>Edit Project</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={handleSubmit}
					className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Project Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter project name"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="systemPrompt">System Prompt</Label>
						<Textarea
							id="systemPrompt"
							value={systemPrompt}
							onChange={(e) => setSystemPrompt(e.target.value)}
							placeholder="Enter system prompt for this project"
							rows={10}
							className="h-64 max-h-96"
						/>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button
								type="button"
								variant="outline"
								disabled={isLoading}>
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="submit"
							disabled={!name?.trim() || !hasChanges || isLoading}>
							{isLoading ? 'Saving...' : 'Save Changes'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
