import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, CoreMessage, processDataStream } from 'ai';
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
		const { threadId, assistantMessageId, model, messages } =
			await request.json();

		if (!threadId || !assistantMessageId || !model || !messages) {
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

		// 4. Initialize AI stream
		const { textStream, finishReason } = streamText({
			model: openrouter.chat(model),
			messages: formattedHistory,
			abortSignal: abortController.signal,
		});

		// 5. Create ReadableStream for dual streaming
		const encoder = new TextEncoder();
		let accumulatedContent = '';
		let wasStopped = false;

		const stream = new ReadableStream({
			async start(controller) {
				try {
					let chunkCount = 0;
					const checkInterval = 3; // Check every 3 chunks

					// Stream chunks and buffer them
					for await (const textPart of textStream) {
						// Periodically check for a stop signal
						if (chunkCount % checkInterval === 0) {
							const stopFlag = await checkStreamStopFlag(assistantMessageId);
							console.log(`Stop flag: ${stopFlag}`);
							if (stopFlag) {
								console.log(`Stop signal received for ${assistantMessageId}`);
								wasStopped = true;
								abortController.abort();
								break;
							}
						}

						processDataStream;

						// Send chunk directly to initiating client
						controller.enqueue(encoder.encode(textPart));

						// Buffer chunk in Redis for late-joining clients
						await addChunkToBuffer(assistantMessageId, textPart);

						// Accumulate for final content
						accumulatedContent += textPart;
						chunkCount++;
					}

					console.log('out of loop');

					// 6. Handle completion
					const finalFinishReason = wasStopped ? 'stop' : await finishReason;
					const status = wasStopped
						? 'complete'
						: finalFinishReason === 'stop' || finalFinishReason === 'length'
						? 'complete'
						: 'error';
					const stopReason = wasStopped
						? 'stopped'
						: status === 'complete'
						? 'completed'
						: 'error';

					console.log(finalFinishReason);

					// Mark completion in Redis
					await markStreamComplete(
						assistantMessageId,
						wasStopped ? 'stopped' : status
					);

					// Finalize in Convex via HTTP action
					await callConvexHttpAction(
						'/finalize-stream',
						{
							messageId: assistantMessageId,
							content: accumulatedContent,
							status: status,
							stopReason: stopReason,
						},
						token
					);

					controller.close();
				} catch (error) {
					console.error('Error in chat stream:', error);

					// Save any accumulated content before erroring

					try {
						await callConvexHttpAction(
							'/finalize-stream',
							{
								messageId: assistantMessageId,
								content: accumulatedContent,
								status: 'error',
								stopReason: 'error',
							},
							token
						);
					} catch (saveError) {
						console.error('Failed to save content on error:', saveError);
					}

					// Mark error in Redis
					await markStreamComplete(assistantMessageId, 'error');

					controller.error(error);
				}
			},

			async cancel() {
				// Handle client disconnection
				console.log(
					'Stream cancelled by client, but will continue in background'
				);
				// This is now only for actual disconnections, not user-initiated stops.
				// The stream will continue to buffer in Redis for other clients.
			},
		});

		// 7. Return stream response
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'X-Content-Type-Options': 'nosniff',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST',
				'Access-Control-Allow-Headers': 'Content-Type, authorization',
			},
		});
	} catch (error) {
		console.error('Error in chat endpoint:', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}

/**
 * Handle preflight requests for CORS
 */
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, authorization',
		},
	});
}

/**
 * Helper function to call Convex HTTP actions
 */
async function callConvexHttpAction(
	actionPath: string,
	body: any,
	token: string
) {
	const convexUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;

	const response = await fetch(`${convexUrl}${actionPath}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`,
			Origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
		},
		body: JSON.stringify(body),
	});

	console.log(`${convexUrl}${actionPath}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`,
			Origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
		},
		body,
	});

	if (!response.ok) {
		throw new Error(await response.text());
	}

	return await response.json();
}
