// convex/llm.ts
import { action } from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

export const generateResponse = action({
	args: {
		threadId: v.id('threads'),
		assistantMessageId: v.id('messages'),
		model: v.string(),
	},
	handler: async (ctx, args) => {
		// Get the last N messages to provide context to the model
		const messageHistory = await ctx.runQuery(api.messages.listByThread, {
			threadId: args.threadId,
		});

		// Format for the OpenAI SDK
		const formattedHistory = messageHistory.map(({ role, content }) => ({
			role,
			content,
		}));

		try {
			console.log('model', args.model);
			// 1. Call OpenRouter and get a stream
			const { textStream, response } = streamText({
				model: openrouter.chat(args.model),
				messages: formattedHistory,
			});

			// 2. Stream the response by repeatedly calling a mutation
			for await (const chunk of textStream) {
				const delta = chunk;
				if (delta) {
					// Call an internal mutation to append the new chunk
					await ctx.runMutation(internal.messages.appendContent, {
						messageId: args.assistantMessageId,
						newContentChunk: delta,
					});
				}
			}
			console.log('response', (await response).modelId);

			// 3. Mark the message as complete
			await ctx.runMutation(internal.messages.markComplete, {
				messageId: args.assistantMessageId,
			});
		} catch (error) {
			console.error('Error streaming from OpenRouter:', error);
			// 4. If an error occurs, update the message status
			await ctx.runMutation(internal.messages.markError, {
				messageId: args.assistantMessageId,
			});
		}
	},
});
