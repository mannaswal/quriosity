import { api, components, internal } from './_generated/api';
import { PersistentTextStreaming } from '@convex-dev/persistent-text-streaming';
import { httpAction } from './_generated/server';
import { Id } from './_generated/dataModel';
import { CoreMessage, streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

export const streamChat = httpAction(async (ctx, request) => {
	const { threadId, assistantMessageId, model } = await request.json();

	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		return new Response('Not authenticated', { status: 401 });
	}

	await ctx.runMutation(internal.threads.setStreaming, {
		threadId,
		isStreaming: true,
	});

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

		// Create AbortController for cancellation
		const abortController = new AbortController();

		const { textStream, finishReason, usage } = await streamText({
			model: openrouter.chat(model),
			messages: formattedHistory,
			abortSignal: abortController.signal,
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

				const checkForCancellation = async () => {
					const thread = await ctx.runQuery(api.threads.getThread, {
						threadId: threadId as Id<'threads'>,
					});
					return !thread?.isStreaming;
				};

				try {
					for await (const textPart of textStream) {
						// Check for cancellation at each batch interval
						if (await checkForCancellation()) {
							abortController.abort();
							await ctx.runMutation(internal.messages.markStopped, {
								messageId: assistantMessageId as Id<'messages'>,
							});
							controller.close();
							return;
						}

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

					// Get the final finish reason and handle appropriately
					const finalFinishReason = await finishReason;

					if (finalFinishReason === 'stop' || finalFinishReason === 'length') {
						await ctx.runMutation(internal.messages.markComplete, {
							messageId: assistantMessageId as Id<'messages'>,
						});
					} else {
						// Handle other finish reasons as errors
						await ctx.runMutation(internal.messages.markError, {
							messageId: assistantMessageId as Id<'messages'>,
						});
					}

					controller.close();
				} catch (error) {
					console.error('Error in text stream:', error);

					// Check if it was cancelled by user
					if (await checkForCancellation()) {
						// Save any accumulated content before stopping
						if (accumulatedContent.length > 0) {
							try {
								await flushToDb();
							} catch (dbError) {
								console.error('Failed to save accumulated content:', dbError);
							}
						}
						await ctx.runMutation(internal.messages.markStopped, {
							messageId: assistantMessageId as Id<'messages'>,
						});
					} else {
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
					}
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
});
