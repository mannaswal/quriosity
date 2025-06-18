'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PaperclipIcon, LoaderIcon } from 'lucide-react';
import { useUploadThing } from '@/utils/uploadthing';
import { TempAttachment } from '@/lib/types';
import { hasVision, hasDocs } from '@/lib/utils';
import { ModelId } from '@/lib/models';
import {
	useTempActions,
	createFileFingerprint,
} from '@/stores/use-temp-data-store';
import { toast } from 'sonner';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

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
	const acceptStrings = [];

	if (canUseText) {
		acceptedTypes.push('Text');
		acceptStrings.push('text/*');
	}
	if (canUseImages) {
		acceptedTypes.push('PNG', 'JPEG', 'GIF', 'WebP', 'HEIC');
		acceptStrings.push('image/*');
	}
	if (canUseDocs) {
		acceptedTypes.push('PDF');
		acceptStrings.push('application/pdf');
	}

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
		acceptString: acceptStrings.join(','),
		endpoint,
	};
}

/**
 * Attachment Manager Component
 * Uses temp store for attachment management with fingerprint-based matching
 */
export function AttachmentManager({
	modelId,
	disabled = false,
}: AttachmentManagerProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [currentUploadFingerprints, setCurrentUploadFingerprints] = useState<
		string[]
	>([]);
	const { addUploadedAttachment, addOptimisticAttachment, removeAttachment } =
		useTempActions();
	const capabilities = getModelCapabilities(modelId);

	/**
	 * Check if a file is a text file based on its MIME type
	 */
	const isTextFile = (file: File): boolean => {
		return file.type.includes('text');
	};

	/**
	 * Format file size in a human-readable format
	 */
	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes}B`;
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
		return `${Math.round(bytes / (1024 * 1024))}MB`;
	};

	/**
	 * Process file name - convert jpg to jpeg for AI model compatibility
	 */
	const processFileName = (fileName: string): string => {
		const lastDotIndex = fileName.lastIndexOf('.');
		if (lastDotIndex === -1) return fileName;

		const baseName = fileName.substring(0, lastDotIndex);
		let extension = fileName.substring(lastDotIndex);

		// Convert .jpg to .jpeg for AI model compatibility
		if (extension === '.jpg') extension = '.jpeg';

		return baseName + extension;
	};

	/**
	 * Check if a file type is compatible with the current model
	 */
	const isFileTypeCompatible = (file: File): boolean => {
		const { canUseImages, canUseDocs, canUseText } = capabilities;

		if (file.type.includes('text') && canUseText) return true;
		if (file.type.includes('image') && canUseImages) return true;
		if (file.type === 'application/pdf' && canUseDocs) return true;

		return false;
	};

	/**
	 * Validate and filter files before upload
	 */
	const validateAndFilterFiles = (files: File[]): { validFiles: File[] } => {
		const maxTextFileSize = 500 * 1024; // 500KB
		const validFiles: File[] = [];
		const rejectedFiles: { name: string; reason: string }[] = [];

		files.forEach((file) => {
			// Check model compatibility first
			if (!isFileTypeCompatible(file)) {
				rejectedFiles.push({
					name: file.name,
					reason: `File type not supported by selected model (${file.type})`,
				});
				return;
			}

			// Check text file size limit
			if (isTextFile(file) && file.size > maxTextFileSize) {
				rejectedFiles.push({
					name: file.name,
					reason: `Text file too large (${formatFileSize(
						file.size
					)} > 500KB limit)`,
				});
				return;
			}

			// Process filename (jpg→jpeg conversion)
			const processedName = processFileName(file.name);

			// Create new file with processed name if needed
			let processedFile: File;
			if (processedName !== file.name) {
				processedFile = new File([file], processedName, {
					type: file.type,
					lastModified: file.lastModified,
				});
			} else {
				processedFile = file;
			}

			validFiles.push(processedFile);
		});

		// Show feedback for rejected files
		if (rejectedFiles.length > 0) {
			const rejectedNames = rejectedFiles
				.map((f) => `${f.name} (${f.reason})`)
				.join(', ');
			toast.error(`Some files were rejected: ${rejectedNames}`);
		}

		return { validFiles };
	};

	const { startUpload } = useUploadThing(capabilities.endpoint, {
		onClientUploadComplete: async (results) => {
			try {
				// Extract text content from text files and match with fingerprints
				const processedResults = await Promise.all(
					results.map(async (result) => {
						let textContent: string | undefined;

						// Extract text content for text files
						if (result.serverData.mimeType.includes('text')) {
							try {
								const response = await fetch(result.serverData.url);
								textContent = await response.text();
							} catch (error) {
								console.error('Failed to extract text content:', error);
							}
						}

						// Create fingerprint to match with optimistic attachment
						const fingerprint = createFileFingerprint(
							result.name,
							result.size,
							result.lastModified || Date.now()
						);

						const tempAttachment: TempAttachment = {
							uploaded: true,
							fingerprint,
							name: result.name,
							url: result.serverData.url,
							mimeType: result.serverData.mimeType,
							type: result.serverData.type,
							uploadThingKey: result.serverData.uploadThingKey,
							textContent,
						};

						return tempAttachment;
					})
				);

				// Update temp store with uploaded attachments
				processedResults.forEach((attachment) => {
					addUploadedAttachment(attachment);
				});

				toast.success(`${results.length} file(s) uploaded successfully!`);
			} catch (error) {
				console.error('Failed to process uploads:', error);
				toast.error('Failed to process uploaded files');

				// Clean up any optimistic attachments that failed processing
				currentUploadFingerprints.forEach((fingerprint) => {
					removeAttachment(fingerprint);
				});
			} finally {
				setIsUploading(false);
				setCurrentUploadFingerprints([]);
			}
		},
		onUploadError: (error) => {
			console.error('Upload error:', error);
			toast.error('Failed to upload files');
			setIsUploading(false);

			// Clean up any optimistic attachments that failed to upload
			currentUploadFingerprints.forEach((fingerprint) => {
				removeAttachment(fingerprint);
			});
			setCurrentUploadFingerprints([]);
		},
		onUploadBegin: () => {
			setIsUploading(true);
		},
	});

	const handleFileSelection = useCallback(
		(files: File[]) => {
			if (!files || files.length === 0) return;

			// Validate and filter files
			const { validFiles } = validateAndFilterFiles(files);

			if (validFiles.length === 0) {
				toast.error('No valid files to upload');
				return;
			}

			// Track fingerprints for cleanup on error
			const fingerprints = validFiles.map((file) =>
				createFileFingerprint(file.name, file.size, file.lastModified)
			);
			setCurrentUploadFingerprints(fingerprints);

			// Add optimistic attachments to temp store using the actual processed files
			validFiles.forEach((file, index) => {
				addOptimisticAttachment(file, file.name);
			});

			// Start upload
			startUpload(validFiles);
		},
		[startUpload, addOptimisticAttachment]
	);

	/**
	 * Handle paste events for file uploads
	 */
	const handlePaste = useCallback(
		(event: ClipboardEvent) => {
			const clipboardData = event.clipboardData;
			if (!clipboardData) return;

			// Check for files first
			if (clipboardData.files.length > 0) {
				const files = Array.from(clipboardData.files);

				// Filter out empty files (sometimes clipboard contains empty file objects)
				const validClipboardFiles = files.filter(
					(file) => file.size > 0 && file.type
				);

				if (validClipboardFiles.length > 0) {
					// Only prevent default if we actually have files to process
					event.preventDefault();
					toast.success(
						`Pasted ${validClipboardFiles.length} file(s) - processing...`
					);
					handleFileSelection(validClipboardFiles);
					return;
				}
			}

			// Check for images in clipboard data (like screenshots)
			const items = Array.from(clipboardData.items);
			const imageItems = items.filter((item) => item.type.startsWith('image/'));

			if (imageItems.length > 0 && capabilities.canUseImages) {
				// Only prevent default if we have images and the model supports them
				event.preventDefault();

				// Convert clipboard images to files
				const imageFiles: File[] = [];
				const promises = imageItems.map((item, index) => {
					return new Promise<void>((resolve) => {
						const blob = item.getAsFile();
						if (blob) {
							// Create a meaningful filename for pasted images
							const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
							const fileName = `pasted-image-${timestamp}.png`;
							const file = new File([blob], fileName, { type: blob.type });
							imageFiles.push(file);
						}
						resolve();
					});
				});

				Promise.all(promises).then(() => {
					if (imageFiles.length > 0) {
						toast.success(
							`Pasted ${imageFiles.length} image(s) - processing...`
						);
						handleFileSelection(imageFiles);
					}
				});
				return;
			}

			// If we get here, it's likely text content - let normal paste behavior happen
			// Don't prevent default, allow normal text pasting to work
		},
		[handleFileSelection, capabilities]
	);

	/**
	 * Set up paste event listener
	 */
	useEffect(() => {
		// Add paste listener to document
		document.addEventListener('paste', handlePaste);

		// Cleanup
		return () => {
			document.removeEventListener('paste', handlePaste);
		};
	}, [handlePaste]);

	return (
		<div className="flex items-center gap-2">
			<Tooltip delayDuration={400}>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => {
							const input = document.createElement('input');
							input.type = 'file';
							input.multiple = true;
							input.accept = capabilities.acceptString;
							input.onchange = (e) => {
								const files = Array.from(
									(e.target as HTMLInputElement).files || []
								);
								handleFileSelection(files);
							};
							input.click();
						}}
						disabled={disabled}>
						<PaperclipIcon
							strokeWidth={1.4}
							className="size-4 text-foreground"
						/>
					</Button>
				</TooltipTrigger>
				<TooltipContent
					side="top"
					align="center"
					className="w-auto">
					<div className="text-xs space-y-1">
						<div>Accepts: {capabilities.acceptedTypesText}</div>
						<div className=" opacity-75 text-muted-foreground">
							Click to browse, or paste files directly
						</div>
					</div>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
