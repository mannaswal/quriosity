import { after, NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, createDataStreamResponse } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { api } from 'convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { markdownJoinerTransform } from '@/utils/markdown-joiner-transform';
import { getCoreMessages, cleanModelId, getReasoning } from '@/server/utils';

export const maxDuration = 500;

if (!process.env.OPENROUTER_API_KEY) {
	throw new Error('Missing OPENROUTER_API_KEY');
}

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
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

		if (!process.env.NEXT_PUBLIC_CONVEX_URL)
			throw new Error('Missing NEXT_PUBLIC_CONVEX_URL');

		const convexClient = new ConvexHttpClient(
			process.env.NEXT_PUBLIC_CONVEX_URL
		);
		convexClient.setAuth(token);

		// 2. Extract request payload
		const {
			// Required
			threadId,
			messageId,
			messages: allMessages,
			model,
			// Optional
			reasoningEffort,
			projectData,
			useWebSearch,
		} = await request.json();

		if (
			!threadId ||
			!model ||
			!allMessages ||
			!allMessages.length ||
			!messageId ||
			!userId
		) {
			return new NextResponse('Missing required fields', { status: 400 });
		}

		// 4. Create our own AbortController to properly stop AI token generation
		const abortController = new AbortController();

		const coreMessages = await getCoreMessages(
			allMessages,
			model,
			projectData,
			convexClient
		);

		const cleanModel = cleanModelId(model, useWebSearch);

		const response = streamText({
			model: openrouter.chat(cleanModel, {
				reasoning: getReasoning(model, reasoningEffort),
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

		return createDataStreamResponse({
			execute: async (dataStream) => {
				if (response) {
					response.mergeIntoDataStream(dataStream, {
						sendReasoning: true,
						sendUsage: true,
					});

					let errorOccurred = false; // Flag to track if an error happened
					let lastSent = Date.now();
					let needsUpdate = true;

					try {
						for await (const chunk of response.fullStream) {
							if (chunk.type === 'error') {
								console.log('[API] Error chunk received:', chunk.error);
								errorOccurred = true; // Set flag on error
								break; // Exit loop on error
							} else if (chunk.type === 'text-delta') {
								content += chunk.textDelta;
								status = 'streaming';
							} else if (chunk.type === 'reasoning') {
								reasoning += chunk.textDelta;
								status = 'reasoning';
							} else {
								console.dir(chunk, { depth: null });
							}

							const now = Date.now();
							if (now - lastSent > 500 && needsUpdate) {
								needsUpdate = false;
								await updateMessage({ content, reasoning, status }) // Use await for clarity
									.then((result) => {
										updateAccepted = result;
									})
									.catch((error) => {
										console.error('[API] updateMessage error:', error);
									})
									.finally(() => {
										needsUpdate = true;
									});
								lastSent = now;
							}

							if (!updateAccepted) {
								abortController.abort();
								break;
							}
						}
					} catch (error) {
						console.error('[API] Stream error in execute:', error);
						errorOccurred = true; // Ensure flag is set for any unhandled errors
					}

					// Only set 'done' if no error occurred
					if (!errorOccurred) {
						await updateMessage({
							content,
							reasoning,
							status: 'done',
							stopReason: 'completed',
						});
					} else {
						console.log('Stream ended with error, skipping done status');
						await updateMessage({
							status: 'error',
							stopReason: 'error',
							content: content,
							reasoning: reasoning,
						});
					}
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

				return 'Error generating response';
			},
		});
	} catch (error) {
		console.error('Error in chat endpoint:', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
