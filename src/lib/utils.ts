import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ModelId, modelsData } from '@/lib/models';
import {
	ReasoningEffort,
	AttachmentType,
	Message,
	TempAttachment,
} from './types';
import {
	AssistantContent,
	CoreMessage,
	FilePart,
	ImagePart,
	TextPart,
	UserContent,
} from 'ai';
import { getRestrictionsMessage } from '@/hooks/use-model-filtering';

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

export const mimeTypeToAttachmentType = (mimeType: string): AttachmentType => {
	if (mimeType.startsWith('image/')) {
		return 'image';
	} else if (mimeType.startsWith('application/pdf')) {
		return 'pdf';
	}
	return 'text';
};

export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1);

export const cap = capitalize;

/**
 * Function to check if a specific model is compatible with the given attachments
 */
export function getModelCompatibility(
	modelId: ModelId,
	attachments: { type: AttachmentType }[] = []
) {
	const needsVision = attachments.some((att) => att.type === 'image');
	const needsDocs = attachments.some((att) => att.type === 'pdf');

	const canHandleVision = hasVision(modelId);
	const canHandleDocs = hasDocs(modelId);

	const isVisionCompatible = !needsVision || canHandleVision;
	const isDocsCompatible = !needsDocs || canHandleDocs;

	return {
		isCompatible: isVisionCompatible && isDocsCompatible,
		isVisionCompatible,
		isDocsCompatible,
	};
}

/**
 * Function to get restrictions based on attachments
 */
export function getRestrictions(attachments: { type: AttachmentType }[]): {
	vision: boolean;
	docs: boolean;
	message: string;
} {
	const needsVision = attachments.some((att) => att.type === 'image');
	const needsDocs = attachments.some((att) => att.type === 'pdf');

	const message = getRestrictionsMessage({
		vision: needsVision,
		docs: needsDocs,
	});

	return {
		vision: needsVision,
		docs: needsDocs,
		message,
	};
}

/**
 * Convert attachments to AI SDK CoreMessage format
 * Transforms attachment data into the content format expected by AI models
 */
export function attachmentsToParts(
	attachments: { url: string; mimeType: string; type: AttachmentType }[]
): (TextPart | ImagePart | FilePart)[] {
	return attachments.map((attachment) => {
		if (attachment.type === 'image') {
			return {
				type: 'image' as const,
				image: attachment.url,
			};
		} else if (attachment.type === 'text') {
			// For text files, we'd need to fetch the content
			// For now, we'll reference the URL - the AI model will need to handle this
			return {
				type: 'file' as const,
				data: attachment.url,
				mimeType: attachment.mimeType,
			};
		} else if (attachment.type === 'pdf') {
			// For PDFs, similar approach - reference the URL
			return {
				type: 'file' as const,
				data: attachment.url,
				mimeType: attachment.mimeType,
			};
		}
		return {
			type: 'file' as const,
			data: attachment.url,
			mimeType: attachment.mimeType,
		};
	});
}

const stringToTextPart = (text: string): TextPart => {
	return {
		type: 'text',
		text,
	};
};

export function messageToCoreMessage(
	message: Message,
	attachments?: { url: string; mimeType: string; type: AttachmentType }[]
): CoreMessage {
	const textContent = message.content;

	if (message.role === 'user') {
		const userContent: UserContent = [];

		if (textContent) userContent.push(stringToTextPart(textContent));

		if (attachments?.length)
			userContent.push(...attachmentsToParts(attachments));

		return {
			role: 'user',
			content: userContent,
		};
	}

	if (message.role === 'assistant') {
		const assistantContent: AssistantContent = [];

		if (textContent) assistantContent.push(stringToTextPart(textContent));

		if (message.reasoning)
			assistantContent.push({
				type: 'reasoning' as const,
				text: message.reasoning,
			});

		return {
			role: 'assistant',
			content: assistantContent,
		};
	}

	return {
		role: message.role,
		content: message.content,
	};
}
