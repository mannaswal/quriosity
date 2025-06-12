import { NextRequest, NextResponse } from 'next/server';
import { getAccumulatedChunks } from '@/lib/redis';

/**
 * Resume stream endpoint for late-joining clients
 * Provides catch-up mechanism by sending accumulated chunks and then live updates
 */
export async function GET(request: NextRequest) {
	try {
		// 1. Extract query parameters
		const { searchParams } = new URL(request.url);
		const messageId = searchParams.get('messageId');
		const sessionId = searchParams.get('sessionId');

		if (!messageId) {
			return new NextResponse('Missing messageId parameter', { status: 400 });
		}

		// 2. Authenticate request (simplified for now)
		const authHeader = request.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		// 3. Get accumulated chunks from Redis
		const accumulatedChunks = await getAccumulatedChunks(messageId);

		// 4. Create a stream that sends accumulated chunks first, then waits for completion
		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Send all accumulated chunks at once for catch-up
					for (const chunk of accumulatedChunks) {
						// Check if this is a completion marker
						try {
							const parsed = JSON.parse(chunk);
							if (parsed.type === 'completion') {
								// Stream is already complete, close the connection
								controller.close();
								return;
							}
						} catch {
							// Not a JSON completion marker, it's a regular chunk
							controller.enqueue(encoder.encode(chunk));
						}
					}

					// 5. Poll for new chunks (simplified polling approach)
					// In a production system, you might use Redis pub/sub or WebSockets
					let lastChunkCount = accumulatedChunks.length;
					const pollInterval = 100; // Poll every 100ms

					const poll = async () => {
						try {
							const currentChunks = await getAccumulatedChunks(messageId);

							// Send any new chunks
							if (currentChunks.length > lastChunkCount) {
								const newChunks = currentChunks.slice(lastChunkCount);

								for (const chunk of newChunks) {
									// Check if this is a completion marker
									try {
										const parsed = JSON.parse(chunk);
										if (parsed.type === 'completion') {
											// Stream is complete, close the connection
											controller.close();
											return;
										}
									} catch {
										// Not a JSON completion marker, it's a regular chunk
										controller.enqueue(encoder.encode(chunk));
									}
								}

								lastChunkCount = currentChunks.length;
							}

							// Continue polling if stream is still active
							setTimeout(poll, pollInterval);
						} catch (error) {
							console.error('Error polling for chunks:', error);
							controller.error(error);
						}
					};

					// Start polling for new chunks
					setTimeout(poll, pollInterval);
				} catch (error) {
					console.error('Error in resume stream:', error);
					controller.error(error);
				}
			},

			cancel() {
				// Handle client disconnection
				console.log('Resume stream cancelled by client');
			},
		});

		// 6. Return stream response
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'X-Content-Type-Options': 'nosniff',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
		});
	} catch (error) {
		console.error('Error in resume endpoint:', error);
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
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	});
}
