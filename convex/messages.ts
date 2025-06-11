// convex/messages.ts
import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { api } from './_generated/api';
import { getMe } from './users';
import { internal } from './_generated/api';

// Query to get messages for the UI
export const listByThread = query({
	args: { threadId: v.id('threads') },
	handler: async (ctx, { threadId }) => {
		// Authorize
		const user = await getMe(ctx);
		if (!user) {
			return [];
		}

		const thread = await ctx.db.get(threadId);
		if (!thread || thread.userId !== user._id) {
			return []; // Or throw an error if you want to be stricter
		}

		return await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', threadId))
			.collect();
	},
});

export const prepareForStream = mutation({
	args: {
		threadId: v.id('threads'),
		messageContent: v.string(),
		model: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		const [_, assistantMessageId] = await Promise.all([
			// 1. Save the user's message to the database
			await ctx.db.insert('messages', {
				threadId: args.threadId,
				role: 'user',
				content: args.messageContent,
				modelUsed: args.model,
			}),

			// 2. Create the placeholder for the assistant's response
			await ctx.db.insert('messages', {
				threadId: args.threadId,
				role: 'assistant',
				content: '', // Start with empty content
				status: 'in_progress', // Set the status
				modelUsed: args.model,
			}),
		]);

		// 3. Return the ID of the placeholder
		return assistantMessageId;
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

export const create = internalMutation({
	args: {
		threadId: v.id('threads'),
		role: v.union(v.literal('user'), v.literal('assistant')),
		content: v.string(),
		modelUsed: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert('messages', args);
	},
});

export const regenerateResponse = mutation({
	args: { userMessageId: v.id('messages') },
	handler: async (ctx, { userMessageId }) => {
		const user = await getMe(ctx);
		if (!user) {
			throw new Error('User not authenticated.');
		}

		const userMessage = await ctx.db.get(userMessageId);
		if (!userMessage || userMessage.role !== 'user') {
			throw new Error('Invalid user message ID.');
		}

		const thread = await ctx.db.get(userMessage.threadId);
		if (!thread || thread.userId !== user._id) {
			throw new Error('User not authorized to access this thread.');
		}

		const modelUsed = userMessage.modelUsed;

		// Find and delete all messages that came after the user's message
		const subsequentMessages = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', userMessage.threadId))
			.filter((q) => q.gt(q.field('_creationTime'), userMessage._creationTime))
			.collect();

		for (const message of subsequentMessages) {
			await ctx.db.delete(message._id);
		}

		// Create a new placeholder message for the assistant
		const newAssistantMessageId = await ctx.db.insert('messages', {
			threadId: userMessage.threadId,
			role: 'assistant',
			content: '',
			status: 'in_progress',
			modelUsed: modelUsed,
		});

		return {
			assistantMessageId: newAssistantMessageId,
			threadId: userMessage.threadId,
			model: modelUsed,
		};
	},
});

export const editAndResubmit = mutation({
	args: { userMessageId: v.id('messages'), newContent: v.string() },
	handler: async (ctx, { userMessageId, newContent }) => {
		const user = await getMe(ctx);
		if (!user) {
			throw new Error('User not authenticated.');
		}

		const userMessage = await ctx.db.get(userMessageId);
		if (!userMessage || userMessage.role !== 'user') {
			throw new Error('Invalid user message ID.');
		}

		const thread = await ctx.db.get(userMessage.threadId);
		if (!thread || thread.userId !== user._id) {
			throw new Error('User not authorized to access this thread.');
		}

		// 1. Update the user's message content
		await ctx.db.patch(userMessage._id, { content: newContent });

		const modelUsed = userMessage.modelUsed;

		// 2. Find and delete all messages that came after the user's message
		const subsequentMessages = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', userMessage.threadId))
			.filter((q) => q.gt(q.field('_creationTime'), userMessage._creationTime))
			.collect();

		for (const message of subsequentMessages) {
			await ctx.db.delete(message._id);
		}

		// 3. Create a new placeholder message for the assistant
		const newAssistantMessageId = await ctx.db.insert('messages', {
			threadId: userMessage.threadId,
			role: 'assistant',
			content: '',
			status: 'in_progress',
			modelUsed: modelUsed,
		});

		return {
			assistantMessageId: newAssistantMessageId,
			threadId: userMessage.threadId,
			model: modelUsed,
		};
	},
});
