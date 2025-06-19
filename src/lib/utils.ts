import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ModelId, modelsData } from '@/lib/models';
import { Attachment, AttachmentType, Message, Thread } from './types';
import {
	AssistantContent,
	CoreMessage,
	FilePart,
	ImagePart,
	TextPart,
	UserContent,
} from 'ai';
import { getRestrictionsMessage } from '@/hooks/use-model-filtering';
import { fetchTextFromUrl } from '@/server/attachments';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const canReason = (model: ModelId | undefined) =>
	(model && modelsData[model]?.reasoning) ?? false;

export const hasEffortControl = (model: ModelId | undefined) =>
	(model && modelsData[model]?.effortControl) ?? false;

export const hasVision = (model: ModelId | undefined) =>
	(model && modelsData[model]?.vision) ?? false;

// export const hasWebSearch = (model: ModelId | undefined) =>
// 	(model && modelsData[model]?.webSearch) ?? false;

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
 * Helper function to group threads by pinned status and recency.
 * Returns an object with keys: pinned, today, yesterday, last7Days, last30Days.
 */
export function groupThreadsByStatusAndRecency(threads: Thread[] | undefined) {
	if (!threads)
		return {
			pinned: [],
			today: [],
			yesterday: [],
			last7Days: [],
			last30Days: [],
			archived: [],
		};

	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate()
	);

	const startOfYesterday = new Date(startOfToday);
	startOfYesterday.setDate(startOfToday.getDate() - 1);
	const startOf7DaysAgo = new Date(startOfToday);
	startOf7DaysAgo.setDate(startOfToday.getDate() - 6); // includes today
	const startOf30DaysAgo = new Date(startOfToday);
	startOf30DaysAgo.setDate(startOfToday.getDate() - 29); // includes today

	const groups = {
		pinned: [] as Thread[],
		today: [] as Thread[],
		yesterday: [] as Thread[],
		last7Days: [] as Thread[],
		last30Days: [] as Thread[],
		archived: [] as Thread[],
	};

	for (const thread of threads) {
		if (thread.archived) {
			groups.archived.push(thread);
			continue;
		}
		if (thread.pinned) {
			groups.pinned.push(thread);
			continue;
		}
		const createdAt = new Date(thread._creationTime);

		if (createdAt >= startOfToday) {
			groups.today.push(thread);
		} else if (createdAt >= startOfYesterday && createdAt < startOfToday) {
			groups.yesterday.push(thread);
		} else if (createdAt >= startOf7DaysAgo && createdAt < startOfYesterday) {
			groups.last7Days.push(thread);
		} else if (createdAt >= startOf30DaysAgo && createdAt < startOf7DaysAgo) {
			groups.last30Days.push(thread);
		}
	}
	return groups;
}
