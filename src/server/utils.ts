import { ModelId, modelsData } from '@/lib/models';
import {
	Attachment,
	AttachmentType,
	Message,
	ProjectData,
	ReasoningEffort,
} from '@/lib/types';
import { getModelCompatibility } from '@/lib/utils';
import {
	CoreMessage,
	CoreSystemMessage,
	TextPart,
	ImagePart,
	FilePart,
	UserContent,
	AssistantContent,
} from 'ai';
import { api } from 'convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { fetchTextFromUrl } from './attachments';

export const getCoreMessages = async (
	allMessages: Message[],
	model: ModelId,
	projectData: ProjectData,
	convexClient: ConvexHttpClient
): Promise<CoreMessage[]> => {
	// 3. Format message history for AI (exclude the empty assistant message)
	const messages = allMessages.filter(
		(msg: Message) => msg.status !== 'pending'
	);

	const coreMessages: CoreMessage[] = await Promise.all(
		messages.map(async (msg: Message, index: number) => {
			const attachments: Attachment[] = [];

			if (msg.attachmentIds?.length) {
				try {
					const fetchedAttachments = await convexClient.query(
						api.attachments.getAttachmentsByIds,
						{ ids: msg.attachmentIds }
					);
					const filteredAttachments = filterAttachmentsByModelCapabilities(
						model,
						fetchedAttachments
					);
					attachments.push(...filteredAttachments);
				} catch (error) {
					console.error('Failed to fetch attachments for message:', error);
				}
			}

			// For the first user message in a project thread, inject project attachments
			if (
				projectData &&
				index === 0 &&
				msg.role === 'user' &&
				projectData.attachments?.length > 0
			) {
				const filteredAttachments = filterAttachmentsByModelCapabilities(
					model,
					projectData.attachments as Attachment[]
				);
				attachments.push(...filteredAttachments);
			}

			return await messageToCoreMessage(msg, attachments);
		})
	);

	// Inject system prompt at the beginning if thread belongs to a project
	if (projectData?.systemPrompt) {
		const systemMessage: CoreSystemMessage = {
			role: 'system',
			content: projectData.systemPrompt,
		};
		coreMessages.unshift(systemMessage);
	}

	return coreMessages;
};

export function filterAttachmentsByModelCapabilities<
	T extends { type: AttachmentType }
>(modelId: ModelId, attachments: T[] = []): T[] {
	const { isVisionCompatible, isDocsCompatible } = getModelCompatibility(
		modelId,
		attachments
	);

	return attachments.filter((att) => {
		if (att.type === 'image' && !isVisionCompatible) return false;
		if (att.type === 'pdf' && !isDocsCompatible) return false;
		return true;
	});
}

/**
 * Convert attachments to AI SDK CoreMessage format
 * Transforms attachment data into the content format expected by AI models
 */
export async function attachmentsToParts(
	attachments: {
		url: string;
		mimeType: string;
		type: AttachmentType;
		textContent?: string;
	}[]
): Promise<(TextPart | ImagePart | FilePart)[]> {
	return Promise.all(
		attachments.map(async (attachment) => {
			if (attachment.type === 'image') {
				return {
					type: 'image' as const,
					image: attachment.url,
				};
			} else if (attachment.type === 'text') {
				let content = attachment.textContent;
				if (!content) {
					try {
						const text = await fetchTextFromUrl(attachment.url);
						content = text;
					} catch (error) {
						console.error('Failed to fetch text content:', error);
					}
				}

				return {
					type: 'text' as const,
					text: content!,
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
		})
	);
}

const stringToTextPart = (text: string): TextPart => {
	return {
		type: 'text',
		text,
	};
};

export async function messageToCoreMessage(
	message: Message,
	attachments?: { url: string; mimeType: string; type: AttachmentType }[]
): Promise<CoreMessage> {
	const textContent = message.content;

	if (message.role === 'user') {
		const userContent: UserContent = [];

		if (textContent) userContent.push(stringToTextPart(textContent));

		if (attachments?.length) {
			const parts = await attachmentsToParts(attachments);
			userContent.push(...parts);
		}

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

export const cleanModelId = (modelId: ModelId, useWebSearch?: boolean) => {
	let cleanId = modelId;

	// Clean reasoning variants
	if (modelId === 'anthropic/claude-sonnet-4:reasoning')
		cleanId = 'anthropic/claude-sonnet-4';
	if (modelId === 'google/gemini-2.5-flash-lite-preview-06-17:thinking')
		cleanId = 'google/gemini-2.5-flash-lite-preview-06-17';

	// Append :online for web search if enabled
	if (useWebSearch) {
		cleanId += ':online';
	}

	return cleanId;
};

const EffortToMaxTokensPercent = {
	high: 0.8,
	medium: 0.5,
	low: 0.2,
};

export const getReasoning = (
	modelId: ModelId,
	reasoningEffort: ReasoningEffort | undefined
):
	| ({
			exclude?: boolean;
	  } & (
			| {
					max_tokens: number;
			  }
			| {
					effort: 'high' | 'medium' | 'low';
			  }
	  ))
	| undefined => {
	if (!reasoningEffort) return undefined;

	if (modelId === 'google/gemini-2.5-flash-lite-preview-06-17:thinking') {
		const maxTokens = modelsData[modelId].maxThinkingTokens!; // Will be defined because of the modelId
		return {
			max_tokens: Math.floor(
				maxTokens * EffortToMaxTokensPercent[reasoningEffort]
			),
		};
	}

	return {
		effort: reasoningEffort,
	};
};
