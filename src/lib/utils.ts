import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ModelId, modelsData } from '@/lib/models';
import { ReasoningEffort, AttachmentType } from './types';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const canReason = (model: ModelId | undefined) =>
	(model && modelsData[model]?.reasoning) ?? false;

export const hasEffortControl = (model: ModelId | undefined) =>
	(model && modelsData[model]?.effortControl) ?? false;

export const hasVision = (model: ModelId | undefined) =>
	(model && modelsData[model]?.vision) ?? false;

export const hasWebSearch = (model: ModelId | undefined) =>
	(model && modelsData[model]?.webSearch) ?? false;

export const hasDocs = (model: ModelId | undefined) =>
	(model && modelsData[model]?.docs) ?? false;

export const hasAttachments = (model: ModelId | undefined) =>
	hasDocs(model) || hasVision(model);

export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1);

export const cap = capitalize;

/**
 * Convert attachments to AI SDK CoreMessage format
 * Transforms attachment data into the content format expected by AI models
 */
export function attachmentsToMessageContent(
	attachments: { url: string; mimeType: string; type: AttachmentType }[]
): any[] {
	return attachments.map((attachment) => {
		if (attachment.type === 'image') {
			return {
				type: 'image',
				image: attachment.url,
			};
		} else if (attachment.type === 'text') {
			// For text files, we'd need to fetch the content
			// For now, we'll reference the URL - the AI model will need to handle this
			return {
				type: 'text',
				text: `[Text file: ${attachment.url}]`,
			};
		} else if (attachment.type === 'pdf') {
			// For PDFs, similar approach - reference the URL
			return {
				type: 'text',
				text: `[PDF document: ${attachment.url}]`,
			};
		}
		return {
			type: 'text',
			text: `[Attachment: ${attachment.url}]`,
		};
	});
}
