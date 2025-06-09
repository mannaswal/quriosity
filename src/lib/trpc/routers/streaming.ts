import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../server';

/**
 * Input schema for the streaming chat procedure
 */
const streamChatInput = z.object({
	threadId: z.string(),
	assistantMessageId: z.string(),
	model: z.string(),
});

/**
 * Streaming router that provides type-safe access to chat streaming
 * This works with the existing HTTP endpoint but adds type safety
 */
export const streamingRouter = createTRPCRouter({
	/**
	 * Get stream configuration with authentication
	 * This replaces the manual token fetching in chat-view.tsx
	 */
	getStreamConfig: protectedProcedure
		.input(streamChatInput)
		.mutation(async ({ input, ctx }) => {
			const { threadId, assistantMessageId, model } = input;

			// Get authentication token for the streaming endpoint
			const token = await ctx.auth.getToken({ template: 'convex' });

			if (!token) {
				throw new Error('Failed to get authentication token');
			}

			// Return the configuration needed for streaming
			return {
				streamUrl: `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/stream`,
				token,
				payload: {
					threadId,
					assistantMessageId,
					model,
				},
			};
		}),
});
