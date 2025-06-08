// convex/messages.ts
import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { api } from './_generated/api';

// Query to get messages for the UI
export const listByThread = query({
	args: { threadId: v.id('threads') },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
			.collect();
	},
});

export const createAndStream = mutation({
	args: {
		threadId: v.id('threads'),
		messageContent: v.string(),
		model: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		// 1. Save the user's message to the database
		await ctx.db.insert('messages', {
			threadId: args.threadId,
			role: 'user',
			content: args.messageContent,
			modelUsed: args.model,
		});

		// 2. Create the placeholder for the assistant's response
		const assistantMessageId = await ctx.db.insert('messages', {
			threadId: args.threadId,
			role: 'assistant',
			content: '', // Start with empty content
			status: 'in_progress', // Set the status
			modelUsed: args.model,
		});

		// 3. Schedule the AI action to run immediately.
		// This is better than the client calling the action directly.
		await ctx.scheduler.runAfter(0, api.llm.generateResponse, {
			threadId: args.threadId,
			assistantMessageId: assistantMessageId,
			model: args.model,
		});
	},
});

// Appends a chunk of text to the message content
export const appendContent = internalMutation({
	args: { messageId: v.id('messages'), newContentChunk: v.string() },
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return; // Or throw an error

		await ctx.db.patch(args.messageId, {
			content: message.content + args.newContentChunk,
		});
	},
});

// Marks the message as fully complete
export const markComplete = internalMutation({
	args: { messageId: v.id('messages') },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, { status: 'complete' });
	},
});

// Marks the message with an error status
export const markError = internalMutation({
	args: { messageId: v.id('messages') },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, { status: 'error' });
	},
});
