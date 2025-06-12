import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../server';
import { ChatMessage } from '@/lib/types';

/**
 * Input schema for the streaming chat procedure
 */
const streamChatInput = z.object({
	threadId: z.string(),
	assistantMessageId: z.string(),
	model: z.string(),
});

/**
 * Input schema for resume stream procedure
 */
const resumeStreamInput = z.object({
	messageId: z.string(),
	sessionId: z.optional(z.string()),
});

/**
 * Streaming router that provides type-safe access to chat streaming via Vercel Edge Functions
 * Updated to work with the new Edge Functions + Redis architecture
 */
export const streamingRouter = createTRPCRouter({
	/**
	 * Get stream configuration for initiating clients
	 * Points to the new Vercel Edge Function at /api/chat
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

			// Get message history for the Edge Function
			// Note: In a real implementation, you'd fetch this from Convex
			const messages: ChatMessage[] = []; // Placeholder - will be populated by the client

			// Return the configuration needed for streaming to Vercel Edge Function
			return {
				streamUrl: '/api/chat',
				resumeUrl: '/api/chat/resume',
				token,
				payload: {
					threadId,
					assistantMessageId,
					model,
					messages, // Will be populated by client
				},
				sessionId: crypto.randomUUID(), // Generate unique session ID
			};
		}),

	/**
	 * Get resume stream configuration for late-joining clients
	 * Points to the resume endpoint for catch-up functionality
	 */
	getResumeConfig: protectedProcedure
		.input(resumeStreamInput)
		.mutation(async ({ input, ctx }) => {
			const { messageId, sessionId } = input;

			// Get authentication token
			const token = await ctx.auth.getToken({ template: 'convex' });

			if (!token) {
				throw new Error('Failed to get authentication token');
			}

			// Return configuration for resuming stream
			return {
				resumeUrl: `/api/chat/resume?messageId=${messageId}&sessionId=${
					sessionId || crypto.randomUUID()
				}`,
				token,
			};
		}),
});
