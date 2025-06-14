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

		if (!token) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const convexClient = new ConvexHttpClient(
			process.env.NEXT_PUBLIC_CONVEX_URL!
		);
		convexClient.setAuth(token);

		// 2. Extract request payload
		const { threadId, model, messages, messageId } = await request.json();

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

		const updateMessage = async (
			content?: string,
			status?: 'streaming' | 'done' | 'error',
			stopReason?: 'completed' | 'stopped' | 'error'
		) => {
			return await convexClient.mutation(api.messages.updateMessage, {
				messageId,
				content,
				status,
				stopReason,
			});
		};

		const response = streamText({
			model: openrouter(model),
			messages: formattedHistory,
			abortSignal: abortController.signal,
			experimental_transform: markdownJoinerTransform(),
		});

		return createDataStreamResponse({
			execute: async (dataStream) => {
				if (response) {
					(async () => {
						await updateMessage('', 'streaming');
					})();

					response.mergeIntoDataStream(dataStream);

					(async () => {
						try {
							let content = '';
							let lastSent = Date.now();

							for await (const chunk of response.fullStream) {
								if (chunk.type === 'text-delta') {
									content += chunk.textDelta;
								}
								const now = Date.now();
								if (now - lastSent > 250) {
									const updateAccepted = await updateMessage(content);
									lastSent = now;

									if (!updateAccepted) {
										abortController.abort(); // Actually stop the AI stream to save tokens
										break;
									}
								}
							}

							await updateMessage(content, 'done', 'completed');
						} catch (error) {
							if (error instanceof DOMException && error.name === 'AbortError')
								return;

							console.error('Streaming error:', error);
							await updateMessage(
								'Error generating response',
								'error',
								'error'
							);
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
					await updateMessage('', 'error', 'error');
				})();
				return 'Error generating response';
			},
		});
	} catch (error) {
		console.error('Error in chat endpoint:', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
