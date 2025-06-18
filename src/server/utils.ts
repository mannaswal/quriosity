import { ModelId } from '@/lib/models';
import { Attachment, Message, ProjectData } from '@/lib/types';
import {
	filterAttachmentsByModelCapabilities,
	messageToCoreMessage,
} from '@/lib/utils';
import { CoreMessage, CoreSystemMessage } from 'ai';
import { api } from 'convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

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
