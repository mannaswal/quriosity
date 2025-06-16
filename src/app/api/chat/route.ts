import { after, NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, CoreMessage, createDataStreamResponse } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { api } from 'convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { markdownJoinerTransform } from '@/utils/markdown-joiner-transform';
import { attachmentsToMessageContent } from '@/lib/utils';

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
		const { threadId, model, messages, messageId, reasoningEffort } =
			await request.json();

		if (!threadId || !model || !messages || !messageId || !userId) {
			return new NextResponse('Missing required fields', { status: 400 });
		}

		// 3. Format message history for AI (exclude the empty assistant message)
		const formattedHistory: CoreMessage[] = await Promise.all(
			messages
				.filter((msg: any) => msg.status !== 'in_progress')
				.map(async (msg: any) => {
					// Base message content
					let content: string | any[] = msg.content;

					// If message has attachments, fetch and format them
					if (msg.attachmentIds && msg.attachmentIds.length > 0) {
						try {
							// Fetch attachment details from Convex
							const attachments = await convexClient.query(
								api.attachments.getAttachmentsByIds,
								{ attachmentIds: msg.attachmentIds }
							);

							if (attachments.length > 0) {
								// Convert to multimodal content format
								const attachmentContent =
									attachmentsToMessageContent(attachments);

								// Combine text content with attachments
								content = [
									{ type: 'text', text: msg.content },
									...attachmentContent,
								];
							}
						} catch (error) {
							console.error('Failed to fetch attachments for message:', error);
							// Continue with text-only message if attachment fetch fails
						}
					}

					return {
						role: msg.role,
						content,
					};
				})
		);

		// 4. Create our own AbortController to properly stop AI token generation
		const abortController = new AbortController();

		const response = streamText({
			model: openrouter.chat(model, {
				reasoning: { effort: reasoningEffort },
			}),
			messages: formattedHistory,
			abortSignal: abortController.signal,
			experimental_transform: markdownJoinerTransform(),
		});

		const updateMessage = async (input: {
			content?: string;
			reasoning?: string;
			status?: 'streaming' | 'done' | 'error' | 'reasoning';
			stopReason?: 'completed' | 'stopped' | 'error';
		}) => {
			console.log('[API] About to update message with status:', input.status);
			const result = await convexClient.mutation(api.messages.updateMessage, {
				messageId,
				content: input.content,
				reasoning: input.reasoning,
				status: input.status,
				stopReason: input.stopReason,
			});
			console.log('[API] Update message result:', result);
			return result;
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

						try {
							for await (const chunk of response.fullStream) {
								if (chunk.type === 'text-delta') {
									content += chunk.textDelta;
									if (status !== 'streaming') {
										status = 'streaming';
									}
									needsUpdate = true;
								} else if (chunk.type === 'reasoning') {
									reasoning += chunk.textDelta;
									if (status !== 'reasoning') {
										status = 'reasoning';
									}
									needsUpdate = true;
								} else if (chunk.type === 'error') {
									console.log('[API] Error chunk received:', chunk.error);
									break;
								}

								const now = Date.now();
								if (needsUpdate && now - lastSent > 300) {
									lastSent = now;
									needsUpdate = false;
									updateMessage({
										content,
										reasoning,
										status,
									})
										.then((accepted) => {
											updateAccepted = accepted;
										})
										.catch((error) => {
											needsUpdate = true;
										});
								}

								if (!updateAccepted) {
									abortController.abort(); // Actually stop the AI stream to save tokens
									break;
								}
							}

							after(
								(async () => {
									await updateMessage({
										content,
										reasoning,
										status: 'done',
										stopReason: 'completed',
									});
								})()
							);
						} catch (streamError) {
							console.error(
								'[API] Error in stream processing loop:',
								streamError
							);
							console.error(
								'[API] Stream error type:',
								(streamError as Error)?.constructor?.name || typeof streamError
							);
							console.error(
								'[API] Stream error message:',
								(streamError as Error)?.message || 'Unknown stream error'
							);

							// Don't call updateMessage here as it might cause the onError handler to be called
							// which would be redundant. The onError handler should catch this.
							throw streamError;
						}
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
				console.error(
					'[API] onError - Error type:',
					(error as Error)?.constructor?.name || typeof error
				);
				console.error(
					'[API] onError - Error message:',
					(error as Error)?.message || 'Unknown error'
				);
				console.error(
					'[API] onError - Full error object:',
					JSON.stringify(error, Object.getOwnPropertyNames(error))
				);

				after(
					(async () => {
						console.log(
							'[API] onError: Updating message to error state due to:',
							(error as Error)?.message || 'Unknown error'
						);
						await updateMessage({
							status: 'error',
							stopReason: 'error',
							content: content,
							reasoning: reasoning,
						});
					})()
				);
				return 'Error generating response';
			},
		});
	} catch (error) {
		console.error('Error in chat endpoint:', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
