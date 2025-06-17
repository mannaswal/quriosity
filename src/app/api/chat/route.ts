import { after, NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
	streamText,
	CoreMessage,
	createDataStreamResponse,
	UserContent,
	CoreSystemMessage,
} from 'ai';
import { auth } from '@clerk/nextjs/server';
import { api } from 'convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { markdownJoinerTransform } from '@/utils/markdown-joiner-transform';
import {
	filterAttachmentsByModelCapabilities,
	messageToCoreMessage,
} from '@/lib/utils';
import { Attachment, Message } from '@/lib/types';
import { error } from 'console';

export const maxDuration = 500;

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY!,
});

/**
 * Main chat endpoint for streaming AI responses
 * Handles initial stream requests from the client who sent the message
 * Creates its own AbortController to properly stop AI token generation when requested
 */
export async function POST(request: NextRequest) {
	try {
		// 1. Authenticate request
		const { getToken, userId } = await auth.protect();
		const token = await getToken({ template: 'convex' });

		if (!token) return new NextResponse('Unauthorized', { status: 401 });

		const convexClient = new ConvexHttpClient(
			process.env.NEXT_PUBLIC_CONVEX_URL!
		);
		convexClient.setAuth(token);

		// 2. Extract request payload
		const {
			threadId,
			model,
			messages: allMessages,
			messageId,
			reasoningEffort,
			projectData,
		} = await request.json();

		if (!threadId || !model || !allMessages || !messageId || !userId) {
			return new NextResponse('Missing required fields', { status: 400 });
		}

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

		// 4. Create our own AbortController to properly stop AI token generation
		const abortController = new AbortController();

		const response = streamText({
			model: openrouter.chat(model, {
				reasoning: { effort: reasoningEffort },
			}),
			messages: coreMessages,
			abortSignal: abortController.signal,
			experimental_transform: markdownJoinerTransform(),
		});

		const updateMessage = async (input: {
			content?: string;
			reasoning?: string;
			status?: 'streaming' | 'done' | 'error' | 'reasoning';
			stopReason?: 'completed' | 'stopped' | 'error';
		}) => {
			return await convexClient.mutation(api.messages.updateMessage, {
				messageId,
				content: input.content,
				reasoning: input.reasoning,
				status: input.status,
				stopReason: input.stopReason,
			});
		};

		let content = '';
		let reasoning = '';
		let status: 'streaming' | 'done' | 'error' | 'reasoning' | undefined =
			undefined;
		let updateAccepted = true;
		let needsUpdate = false;

		return createDataStreamResponse({
			execute: async (dataStream) => {
				if (response) {
					response.mergeIntoDataStream(dataStream, {
						sendReasoning: true,
						sendUsage: true,
					});

					(async () => {
						let lastSent = Date.now();

						for await (const chunk of response.fullStream) {
							if (chunk.type === 'text-delta') {
								content += chunk.textDelta;
								status = 'streaming';
							} else if (chunk.type === 'reasoning') {
								reasoning += chunk.textDelta;
								status = 'reasoning';
							} else if (chunk.type === 'error') {
								console.log('[API] Error chunk received:', chunk.error);
								break;
							}

							const now = Date.now();
							if (now - lastSent > 400) {
								needsUpdate = false;

								updateMessage({
									content,
									reasoning,
									status,
								})
									.then((result) => {
										updateAccepted = result;
										needsUpdate = true;
									})
									.catch((error) => {
										needsUpdate = true;
									});

								lastSent = now;
							}

							if (!updateAccepted) {
								abortController.abort(); // Actually stop the AI stream to save tokens
								break;
							}
						}

						(async () => {
							updateMessage({
								content,
								reasoning,
								status: 'done',
								stopReason: 'completed',
							});
						})();
					})();
				}
			},
			onError: (error) => {
				if (error instanceof DOMException && error.name === 'AbortError') {
					console.log(
						'[API] onError: AbortError detected, not updating message'
					);
					return 'Stream aborted by user';
				}
				console.error('[API] onError triggered - Streaming error:', error);

				(async () => {
					updateMessage({
						status: 'error',
						stopReason: 'error',
						content: content,
						reasoning: reasoning,
					});
				})();

				return 'Error generating response';
			},
		});
	} catch (error) {
		console.error('Error in chat endpoint:', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
