import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogTrigger,
	DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateProject } from '@/hooks/use-projects';

interface ProjectCreateDialogProps {
	children: React.ReactNode;
}

export function ProjectCreateDialog({ children }: ProjectCreateDialogProps) {
	const [name, setName] = useState('');
	const [systemPrompt, setSystemPrompt] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const createProject = useCreateProject();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		setIsLoading(true);
		try {
			await createProject({
				name: name.trim(),
				systemPrompt: systemPrompt.trim(),
			});

			// Reset form
			setName('');
			setSystemPrompt('');
			setIsOpen(false);
		} catch (error) {
			console.error('Failed to create project:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-2xl w-full">
				<DialogHeader>
					<DialogTitle>Create New Project</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={handleSubmit}
					className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Project name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter project name"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="systemPrompt">Project knowledge</Label>
						<p className="text-xs text-muted-foreground leading-relaxed">
							Add any relevant information that will help the AI understand the
							project and its context. This will be added to the system prompt
							of all conversations in this project.
						</p>
						<Textarea
							id="systemPrompt"
							value={systemPrompt}
							onChange={(e) => setSystemPrompt(e.target.value)}
							placeholder="Your optional project knowledge here..."
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
							disabled={!name.trim() || isLoading}>
							{isLoading ? 'Creating...' : 'Create Project'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
