'use client';

import { useState, useCallback } from 'react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useToggleThreadPublic } from '@/hooks/use-threads';
import { Thread } from '@/lib/types';
import { AnimatePresence, motion } from 'motion/react';

interface ShareThreadDialogProps {
	children?: React.ReactNode;
	thread: Thread;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export const ShareThreadDialog = ({
	children,
	thread,
	open,
	onOpenChange,
}: ShareThreadDialogProps) => {
	const [internalOpen, setInternalOpen] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const toggleThreadPublic = useToggleThreadPublic();

	const isOpen = open !== undefined ? open : internalOpen;
	const setIsOpen = onOpenChange || setInternalOpen;

	// Generate share URL
	const shareUrl =
		thread.shareId && typeof window !== 'undefined'
			? `${window.location.origin}/share/${thread.shareId}`
			: '';

	const handleTogglePublic = useCallback(
		async (isPublic: boolean) => {
			try {
				await toggleThreadPublic({
					threadId: thread._id,
					isPublic,
				});

				if (!isPublic) {
					setIsOpen(false);
				}
			} catch (error) {
				console.error('Failed to toggle thread public status:', error);
			}
		},
		[toggleThreadPublic, thread._id, setIsOpen]
	);

	const handleCopyLink = useCallback(async () => {
		if (!shareUrl) return;

		try {
			await navigator.clipboard.writeText(shareUrl);
			setIsCopied(true);
			toast.success('Share link copied to clipboard!');

			// Reset copy state after 2 seconds
			setTimeout(() => setIsCopied(false), 2000);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			toast.error('Failed to copy link');
		}
	}, [shareUrl]);

	const handleOpenInNewTab = useCallback(() => {
		if (!shareUrl) return;
		window.open(shareUrl, '_blank');
	}, [shareUrl]);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={setIsOpen}>
			{children && (
				<DialogTrigger
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						setIsOpen(true);
					}}
					asChild>
					{children}
				</DialogTrigger>
			)}
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{thread.isPublic ? 'Manage sharing' : 'Share conversation'}
					</DialogTitle>
					<DialogDescription>
						{thread.isPublic
							? 'This conversation is currently public. Anyone with the link can view it.'
							: 'Make this conversation public to share it with others.'}
					</DialogDescription>
				</DialogHeader>

				<motion.div
					className="space-y-4"
					layout
					transition={{
						duration: 0.3,
						ease: [0.04, 0.62, 0.23, 0.98],
					}}>
					{/* Public Toggle */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label
								htmlFor="public-toggle"
								className="text-base">
								Public sharing
							</Label>
							<div className="text-sm text-muted-foreground">
								{thread.isPublic
									? 'Anyone with the link can view this chat'
									: 'Generate a shareable link for this chat'}
							</div>
						</div>
						<Switch
							id="public-toggle"
							checked={thread.isPublic}
							onCheckedChange={handleTogglePublic}
						/>
					</div>

					{/* Share Link Section - Only show when public */}
					<AnimatePresence initial={false}>
						{thread.isPublic && shareUrl && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{
									duration: 0.3,
									ease: [0.04, 0.62, 0.23, 0.98],
								}}
								className="overflow-hidden">
								<div className="space-y-2 pb-1">
									<Label htmlFor="share-url">Share link</Label>
									<div className="flex space-x-2">
										<Input
											id="share-url"
											value={shareUrl}
											readOnly
											className="text-sm"
										/>
										<Button
											type="button"
											variant="secondary"
											size="icon"
											onClick={handleCopyLink}
											className="shrink-0">
											{isCopied ? (
												<Check className="h-4 w-4" />
											) : (
												<Copy className="h-4 w-4" />
											)}
										</Button>
										<Button
											type="button"
											variant="secondary"
											size="icon"
											onClick={handleOpenInNewTab}
											className="shrink-0">
											<ExternalLink className="h-4 w-4" />
										</Button>
									</div>
									<p className="text-xs text-muted-foreground">
										Anyone with this link can view this conversation, even
										without an account.
									</p>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Action Buttons */}
					<div className="flex justify-end space-x-2 pt-4">
						<DialogClose asChild>
							<Button variant="outline">
								{thread.isPublic ? 'Done' : 'Cancel'}
							</Button>
						</DialogClose>
						<AnimatePresence initial={false}>
							{thread.isPublic && (
								<motion.div
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.95 }}
									transition={{
										duration: 0.2,
										ease: 'easeInOut',
									}}>
									<Button
										variant="destructive"
										onClick={() => handleTogglePublic(false)}>
										Stop sharing
									</Button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
};
