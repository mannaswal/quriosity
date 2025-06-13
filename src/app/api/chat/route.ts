import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, CoreMessage, createDataStreamResponse } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { api } from 'convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY!,
});

/**
 * Main chat endpoint for streaming AI responses
 * Handles initial stream requests from the client who sent the message
 * Implements dual streaming: direct to client + Redis buffering for other clients
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

		const abortController = new AbortController();

		const response = streamText({
			model: openrouter(model),
			messages: formattedHistory,
		});

		return createDataStreamResponse({
			execute: async (dataStream) => {
				if (response) {
					response.mergeIntoDataStream(dataStream);

					const updateMessage = async (
						content: string,
						status: 'streaming' | 'done' | 'error',
						stopReason?: 'completed' | 'stopped' | 'error'
					) => {
						await convexClient.mutation(api.messages.updateMessage, {
							messageId,
							content,
							status,
							stopReason,
						});
					};

					(async () => {
						let content = '';
						let lastSent = Date.now();
						await updateMessage(content, 'streaming');

						for await (const chunk of response.fullStream) {
							if (chunk.type === 'text-delta') {
								content += chunk.textDelta;
							}
							const now = Date.now();
							if (now - lastSent > 500) {
								await updateMessage(content, 'streaming');
								lastSent = now;
							}
						}
						await updateMessage(content, 'done', 'completed');
					})();
				}
			},
		});
	} catch (error) {
		console.error('Error in chat endpoint:', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
