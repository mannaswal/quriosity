'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UploadIcon, LoaderIcon } from 'lucide-react';
import { useUploadThing } from '@/utils/uploadthing';
import { AttachmentType } from '@/lib/types';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { toast } from 'sonner';

interface ProjectUploadButtonProps {
	projectId: Id<'projects'>;
	disabled?: boolean;
}

/**
 * File upload button for projects
 * Uploads files via UploadThing, extracts text content from text files,
 * and automatically adds them to the specified project
 */
export function ProjectUploadButton({
	projectId,
	disabled = false,
}: ProjectUploadButtonProps) {
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const insertAttachments = useMutation(api.attachments.insertAttachments);

	const { startUpload, routeConfig } = useUploadThing('allFilesUploader', {
		onClientUploadComplete: async (results) => {
			try {
				// Extract text content from text files
				const attachmentsWithTextContent = await Promise.all(
					results.map(async (result) => {
						let textContent: string | undefined;

						// If it's a text file, we need to fetch and extract the content
						if (result.serverData.mimeType.includes('text')) {
							try {
								const response = await fetch(result.serverData.url);
								textContent = await response.text();
							} catch (error) {
								console.error('Failed to extract text content:', error);
								// Continue without text content rather than failing
							}
							console.log(
								result.serverData.name,
								result.serverData.mimeType,
								textContent?.length
							);
						}

						return {
							filename: result.name,
							url: result.serverData.url,
							mimeType: result.serverData.mimeType,
							type: result.serverData.type,
							key: result.serverData.uploadThingKey,
							textContent,
						};
					})
				);

				// Insert all attachments and add them to the project in one server call
				await insertAttachments({
					attachments: attachmentsWithTextContent,
					projectId,
				});

				toast.success(`${results.length} file(s) uploaded to project!`);
			} catch (error) {
				console.error('Failed to process uploads:', error);
				toast.error('Failed to add files to project');
			} finally {
				setIsUploading(false);
			}
		},
		onUploadError: (error) => {
			console.error('Upload error:', error);
			toast.error('Failed to upload files');
			setIsUploading(false);
		},
		onUploadBegin: () => {
			setIsUploading(true);
		},
	});

	const handleButtonClick = () => {
		if (disabled || isUploading) return;
		fileInputRef.current?.click();
	};

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

	const handleFileChange = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		const fileArray = Array.from(files);
		const maxTextFileSize = 500 * 1024; // 500kb in bytes

		// Filter out text files that are too large
		const validFiles: File[] = [];
		const rejectedFiles: { name: string; size: number; reason: string }[] = [];

		fileArray.forEach((file) => {
			// Check if it's a text file and if it's too large
			if (isTextFile(file) && file.size > maxTextFileSize) {
				rejectedFiles.push({
					name: file.name,
					size: file.size,
					reason: `Text file too large (${formatFileSize(
						file.size
					)} > 500KB limit)`,
				});
			} else {
				validFiles.push(file);
			}
		});

		// Show feedback for rejected files
		if (rejectedFiles.length > 0) {
			const rejectedNames = rejectedFiles
				.map((f) => `${f.name} (${f.reason})`)
				.join(', ');
			toast.error(`Some files were rejected: ${rejectedNames}`);
		}

		// Only upload valid files
		if (validFiles.length > 0) {
			startUpload(validFiles);
		} else if (rejectedFiles.length > 0) {
			// All files were rejected
			toast.error('No files to upload - all were rejected due to size limits');
		}

		// Reset input so same files can be selected again
		event.target.value = '';
	};

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/*"
				onChange={handleFileChange}
				style={{ display: 'none' }}
			/>
			<Button
				variant="outline"
				className="flex items-center gap-2"
				onClick={handleButtonClick}
				disabled={disabled || isUploading}>
				{isUploading ? (
					<LoaderIcon className="size-4 animate-spin" />
				) : (
					<UploadIcon className="size-4" />
				)}
				{isUploading ? 'Uploading...' : 'Upload Files'}
			</Button>
		</>
	);
}
