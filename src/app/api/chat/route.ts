import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, CoreMessage, createDataStreamResponse } from 'ai';
import {
	addChunkToBuffer,
	checkStreamStopFlag,
	markStreamComplete,
} from '@/lib/redis';
import { auth } from '@clerk/nextjs/server';

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
		const { getToken } = await auth.protect();
		const token = await getToken();

		if (!token) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		// 2. Extract request payload
		const { threadId, model, messages } = await request.json();

		if (!threadId || !model || !messages) {
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
				}
				console.log(dataStream);
			},
		});
	} catch (error) {
		console.error('Error in chat endpoint:', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
