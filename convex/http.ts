import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api, internal } from './_generated/api';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { CoreMessage, streamText } from 'ai';
import { Id } from './_generated/dataModel';

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

const http = httpRouter();

http.route({
	path: '/stream',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const { threadId, assistantMessageId, model } = await request.json();

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return new Response('Not authenticated', { status: 401 });
		}

		try {
			const messageHistory = await ctx.runQuery(api.messages.listByThread, {
				threadId: threadId as Id<'threads'>,
			});

			const formattedHistory: CoreMessage[] = messageHistory
				// Don't include the empty assistant message placeholder
				.filter((msg) => msg.status !== 'in_progress')
				.map(({ role, content }) => ({
					role,
					content,
				}));

			const { textStream } = await streamText({
				model: openrouter.chat(model),
				messages: formattedHistory,
			});

			// Create a ReadableStream that will stream to the client
			const encoder = new TextEncoder();
			const clientStream = new ReadableStream({
				async start(controller) {
					let accumulatedContent = '';
					let lastDbUpdate = Date.now();
					const BATCH_SIZE = 250; // characters
					const TIME_INTERVAL = 500; // milliseconds

					const flushToDb = async () => {
						if (accumulatedContent.length > 0) {
							await ctx.runMutation(internal.messages.appendContent, {
								messageId: assistantMessageId as Id<'messages'>,
								newContentChunk: accumulatedContent,
							});
							accumulatedContent = '';
							lastDbUpdate = Date.now();
						}
					};

					try {
						for await (const textPart of textStream) {
							// Send chunk to client immediately
							controller.enqueue(encoder.encode(textPart));

							// Accumulate for database batching
							accumulatedContent += textPart;

							// Flush to database if batch size reached or time interval passed
							const shouldFlush =
								accumulatedContent.length >= BATCH_SIZE ||
								Date.now() - lastDbUpdate >= TIME_INTERVAL;

							if (shouldFlush) {
								await flushToDb();
							}
						}

						// Flush any remaining content
						await flushToDb();

						// Mark as complete when done
						await ctx.runMutation(internal.messages.markComplete, {
							messageId: assistantMessageId as Id<'messages'>,
						});

						controller.close();
					} catch (error) {
						console.error('Error in text stream:', error);

						// Try to save any accumulated content before erroring
						if (accumulatedContent.length > 0) {
							try {
								await flushToDb();
							} catch (dbError) {
								console.error('Failed to save accumulated content:', dbError);
							}
						}

						await ctx.runMutation(internal.messages.markError, {
							messageId: assistantMessageId as Id<'messages'>,
						});
						controller.error(error);
					}
				},
			});

			// Return the stream for the client
			return new Response(clientStream, {
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'X-Content-Type-Options': 'nosniff',
					'Access-Control-Allow-Origin': '*',
				},
			});
		} catch (error) {
			console.error('Error in stream action:', error);
			// This catch block will handle errors from the initial `streamText` call
			await ctx.runMutation(internal.messages.markError, {
				messageId: assistantMessageId as Id<'messages'>,
			});
			return new Response('Error initiating stream.', { status: 500 });
		}
	}),
});

http.route({
	path: '/stream',
	method: 'OPTIONS',
	handler: httpAction(async (_, request) => {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400',
			},
		});
	}),
});

export default http;
