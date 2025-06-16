'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	PaperclipIcon,
	XIcon,
	FileTextIcon,
	ImageIcon,
	FileIcon,
	LoaderIcon,
} from 'lucide-react';
import { UploadButton } from '@/utils/uploadthing';
import { Attachment, AttachmentType } from '@/lib/types';
import { hasVision, hasDocs } from '@/lib/utils';
import { ModelId } from '@/lib/models';

interface AttachmentManagerProps {
	attachments: Attachment[];
	onAttachmentsChange: (attachments: Attachment[]) => void;
	modelId?: ModelId;
	disabled?: boolean;
}

/**
 * Get model capabilities and the appropriate upload endpoint
 */
function getModelCapabilities(modelId?: ModelId) {
	const canUseImages = hasVision(modelId);
	const canUseDocs = hasDocs(modelId);
	const canUseText = true; // All models can handle text files

	const acceptedTypes = [];
	if (canUseText) acceptedTypes.push('Text');
	if (canUseImages) acceptedTypes.push('PNG', 'JPEG', 'GIF', 'WebP', 'HEIC');
	if (canUseDocs) acceptedTypes.push('PDF');

	// Determine the appropriate endpoint based on capabilities
	let endpoint:
		| 'textOnlyUploader'
		| 'docsTextUploader'
		| 'imagesTextUploader'
		| 'allFilesUploader';

	if (canUseImages && canUseDocs) {
		endpoint = 'allFilesUploader';
	} else if (canUseImages && !canUseDocs) {
		endpoint = 'imagesTextUploader';
	} else if (!canUseImages && canUseDocs) {
		endpoint = 'docsTextUploader';
	} else {
		endpoint = 'textOnlyUploader';
	}

	return {
		canUseImages,
		canUseDocs,
		canUseText,
		acceptedTypesText: acceptedTypes.join(', '),
		endpoint,
	};
}

/**
 * Get appropriate icon for attachment type
 */
function getAttachmentIcon(type: AttachmentType) {
	switch (type) {
		case 'image':
			return <ImageIcon className="size-4" />;
		case 'pdf':
			return <FileTextIcon className="size-4" />;
		case 'text':
			return <FileIcon className="size-4" />;
		default:
			return <FileIcon className="size-4" />;
	}
}

/**
 * Attachment Manager Component
 * Single upload button with dynamic file type acceptance
 */
export function AttachmentManager({
	attachments,
	onAttachmentsChange,
	modelId,
	disabled = false,
}: AttachmentManagerProps) {
	const [isUploading, setIsUploading] = useState(false);
	const capabilities = getModelCapabilities(modelId);

	const handleRemoveAttachment = useCallback(
		(attachmentId: string) => {
			onAttachmentsChange(
				attachments.filter((att) => att._id !== attachmentId)
			);
		},
		[attachments, onAttachmentsChange]
	);

	const handleUploadComplete = useCallback(
		(results: any[]) => {
			const newAttachments = results.map((res) => ({
				_id: res.attachmentId,
				_creationTime: Date.now(),
				filename: res.name || 'Unknown',
				originalFilename: res.name || 'Unknown',
				url: res.url,
				mimeType: res.type || 'application/octet-stream',
				type: res.type as AttachmentType,
				userId: res.uploadedBy || '',
			})) as Attachment[];

			onAttachmentsChange([...attachments, ...newAttachments]);
			setIsUploading(false);
		},
		[attachments, onAttachmentsChange]
	);

	const handleUploadError = useCallback((error: Error) => {
		console.error('Upload error:', error);
		setIsUploading(false);
	}, []);

	const handleUploadBegin = useCallback(() => {
		setIsUploading(true);
	}, []);

	return (
		<div className="flex items-center gap-2">
			{/* Attachment Previews */}
			{attachments.length > 0 && (
				<div className="flex items-center gap-1 mr-2">
					{attachments.map((attachment) => (
						<div
							key={attachment._id}
							className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs">
							{getAttachmentIcon(attachment.type)}
							<span className="max-w-20 truncate">
								{attachment.originalFilename}
							</span>
							<Button
								variant="ghost"
								size="icon"
								className="size-4 hover:bg-destructive/10"
								onClick={() => handleRemoveAttachment(attachment._id)}>
								<XIcon className="size-3" />
							</Button>
						</div>
					))}
				</div>
			)}

			{/* Uploading Indicator */}
			{isUploading && (
				<div className="flex items-center gap-1 mr-2">
					<div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-xs">
						<LoaderIcon className="size-4 animate-spin" />
						<span>Uploading...</span>
					</div>
				</div>
			)}

			{/* Upload Button with Popover */}
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						asChild>
						<UploadButton
							endpoint={capabilities.endpoint}
							onClientUploadComplete={handleUploadComplete}
							onUploadError={handleUploadError}
							onUploadBegin={handleUploadBegin}
							content={{
								button: <PaperclipIcon className="size-4 stroke-[1.5]" />,
							}}
							appearance={{
								allowedContent: 'hidden',
							}}
						/>
					</Button>
				</PopoverTrigger>
				<PopoverContent
					side="top"
					align="center"
					className="w-auto p-2">
					<div className="text-xs text-muted-foreground">
						Accepts: {capabilities.acceptedTypesText}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
