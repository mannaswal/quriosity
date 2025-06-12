import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, CoreMessage } from 'ai';
import { addChunkToBuffer, markStreamComplete } from '@/lib/redis';

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY!,
});

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
			Authorization: `Bearer ${token}`,
			Origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`Convex HTTP action failed: ${response.statusText}`);
	}

	return await response.json();
}

/**
 * Main chat endpoint for streaming AI responses
 * Handles initial stream requests from the client who sent the message
 * Implements dual streaming: direct to client + Redis buffering for other clients
 */
export async function POST(request: NextRequest) {
	try {
		// 1. Authenticate request
		const authHeader = request.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const token = authHeader.substring(7);

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

		// 4. Initialize AI stream
		const { textStream, finishReason } = await streamText({
			model: openrouter.chat(model),
			messages: formattedHistory,
		});

		// 5. Create ReadableStream for dual streaming
		const encoder = new TextEncoder();
		let accumulatedContent = '';

		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Stream chunks and buffer them
					for await (const textPart of textStream) {
						// Send chunk directly to initiating client
						controller.enqueue(encoder.encode(textPart));

						// Buffer chunk in Redis for late-joining clients
						await addChunkToBuffer(assistantMessageId, textPart);

						// Accumulate for final content
						accumulatedContent += textPart;
					}

					// 6. Handle completion
					const finalFinishReason = await finishReason;
					const status =
						finalFinishReason === 'stop' || finalFinishReason === 'length'
							? 'complete'
							: 'error';

					// Mark completion in Redis
					await markStreamComplete(assistantMessageId, status);

					// Finalize in Convex via HTTP action
					await callConvexHttpAction(
						'/finalize-stream',
						{
							messageId: assistantMessageId,
							content: accumulatedContent,
							status: status,
							stopReason: status === 'complete' ? 'completed' : 'error',
						},
						token
					);

					controller.close();
				} catch (error) {
					console.error('Error in chat stream:', error);

					// Save any accumulated content before erroring
					if (accumulatedContent.length > 0) {
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
					}

					// Mark error in Redis
					await markStreamComplete(assistantMessageId, 'error');

					controller.error(error);
				}
			},

			cancel() {
				// Handle client disconnection
				console.log('Stream cancelled by client');
			},
		});

		// 7. Return stream response
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'X-Content-Type-Options': 'nosniff',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	});
}
