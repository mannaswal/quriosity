import { Thread } from '@/lib/types';
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DeleteThreadButton = ({
	thread,
	handleDeleteThread,
	inside = 'sidebar',
}: {
	thread: Thread;
	handleDeleteThread: () => Promise<void>;
	inside: 'sidebar' | 'projects';
}) => {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						inside === 'sidebar' &&
							'size-6 shrink-0 rounded-sm dark:hover:bg-sidebar-accent-foreground/20 cursor-pointer'
					)}>
					<XIcon className={cn(inside === 'sidebar' && 'size-3')} />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="sm:max-w-sm">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete thread?</AlertDialogTitle>
					<AlertDialogDescription className="leading-relaxed">
						Are you sure you want to delete the thread "{thread.title}"?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel asChild>
						<Button variant="outline">Cancel</Button>
					</AlertDialogCancel>
					<Button
						variant="destructive"
						onClick={handleDeleteThread}>
						Delete
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
