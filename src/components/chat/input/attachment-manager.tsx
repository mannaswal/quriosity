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
import { AttachmentType, TempAttachment } from '@/lib/types';
import { hasVision, hasDocs } from '@/lib/utils';
import { ModelId } from '@/lib/models';
import {
	useTempAttachments,
	useTempActions,
} from '@/stores/use-temp-data-store';
import { ClientUploadedFileData } from 'uploadthing/types';
import { deleteFromUploadThing } from '@/app/api/uploadthing/route';
import { toast } from 'sonner';

interface AttachmentManagerProps {
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
 * Uses temp store for attachment management
 */
export function AttachmentManager({
	modelId,
	disabled = false,
}: AttachmentManagerProps) {
	// const [isUploading, setIsUploading] = useState(false);
	const { addUploadedAttachment, addOptimisticAttachment } = useTempActions();
	const capabilities = getModelCapabilities(modelId);

	const handleUploadComplete = useCallback(
		(
			results: ClientUploadedFileData<{
				id: string;
				name: string;
				url: string;
				mimeType: string;
				type: AttachmentType;
				uploadThingKey: string;
				uploadedBy: string;
			}>[]
		) => {
			console.log('upload complete', results);
			results.forEach((result) => {
				const tempAttachment: TempAttachment = {
					uploaded: true,
					name: result.name,
					url: result.serverData.url,
					mimeType: result.serverData.mimeType,
					type: result.serverData.type,
					uploadThingKey: result.serverData.uploadThingKey,
				};
				addUploadedAttachment(tempAttachment);
			});
		},
		[addUploadedAttachment]
	);

	const handleUploadError = useCallback((error: Error) => {
		console.error('Upload error:', error);
		toast.error('Failed to upload attachment');
	}, []);

	const handleBeforeUploadBegin = useCallback((files: File[]): File[] => {
		const renamedFiles: File[] = [];
		const fileNameCounts: Map<string, number> = new Map(); // To track occurrences of each base filename

		files.forEach((file) => {
			const originalFileName = file.name;
			const lastDotIndex = originalFileName.lastIndexOf('.');
			let baseName = originalFileName;
			let extension = '';

			// Separate base name and extension
			if (lastDotIndex !== -1 && lastDotIndex > 0) {
				baseName = originalFileName.substring(0, lastDotIndex);
				extension = originalFileName.substring(lastDotIndex); // includes the dot, e.g., ".pdf"
			}

			if (extension === '.jpg') extension = '.jpeg';

			// Get current count for this base name
			const currentCount = fileNameCounts.get(baseName) || 0;

			let newFileName = originalFileName;
			if (currentCount > 0) {
				// Append (count) to the filename
				newFileName = `${baseName} (${currentCount})${extension}`;
			} else {
				newFileName = baseName + extension;
			}

			// Increment count for the next occurrence of this base name
			fileNameCounts.set(baseName, currentCount + 1);

			// Create a new File object with the updated name
			// The File constructor allows creating a new File with the same content and different metadata
			renamedFiles.push(
				new File([file], newFileName, {
					type: file.type,
					lastModified: file.lastModified,
				})
			);
		});

		renamedFiles.forEach((file) => {
			addOptimisticAttachment(file);
		});

		return renamedFiles;
	}, []); // No dependencies needed for this logic, as it operates on the input 'files'

	return (
		<div className="flex items-center gap-2">
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						asChild>
						<UploadButton
							config={{
								appendOnPaste: true,
							}}
							endpoint={capabilities.endpoint}
							onClientUploadComplete={handleUploadComplete}
							onUploadError={handleUploadError}
							onBeforeUploadBegin={handleBeforeUploadBegin}
							onUploadProgress={(progress) => {
								console.log('upload progress', progress);
							}}
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
