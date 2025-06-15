import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, CoreMessage, createDataStreamResponse } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { api } from 'convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { markdownJoinerTransform } from '@/utils/markdown-joiner-transform';

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
		const formattedHistory: CoreMessage[] = messages
			.filter((msg: any) => msg.status !== 'in_progress')
			.map((msg: any) => ({
				role: msg.role,
				content: msg.content,
			}));

		// 4. Create our own AbortController to properly stop AI token generation
		const abortController = new AbortController();

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

		const response = streamText({
			model: openrouter.chat(model, {
				reasoning: { effort: reasoningEffort ?? 'medium' },
			}),
			messages: formattedHistory,
			abortSignal: abortController.signal,
			experimental_transform: markdownJoinerTransform(),
		});

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
						try {
							let lastSent = Date.now();

							for await (const chunk of response.fullStream) {
								if (chunk.type === 'text-delta') {
									content += chunk.textDelta;
									if (status !== 'streaming') {
										status = 'streaming';
										needsUpdate = true;
									}
									needsUpdate = true;
								} else if (chunk.type === 'reasoning') {
									reasoning += chunk.textDelta;
									if (status !== 'reasoning') {
										status = 'reasoning';
										needsUpdate = true;
									}
									needsUpdate = true;
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

							await updateMessage({
								content,
								reasoning,
								status: 'done',
								stopReason: 'completed',
							});
						} catch (error) {
							if (error instanceof DOMException && error.name === 'AbortError')
								return;

							console.error('Streaming error:', error);
							await updateMessage({
								content: content,
								reasoning: reasoning,
								status: 'error',
								stopReason: 'error',
							});
						}
					})();
				}
			},
			onError: (error) => {
				if (error instanceof DOMException && error.name === 'AbortError') {
					return 'Stream aborted by user';
				}
				console.error('Streaming error onError:', error);
				(async () => {
					await updateMessage({
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
