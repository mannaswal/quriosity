import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';

export const listByThread = query({
	args: { threadId: v.id('threads') },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
			.collect();
	},
});

export const createThreadAndSendMessage = mutation({
	args: {
		messageContent: v.string(),
		model: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		// Check if a user record for this auth_id already exists
		const existingUser = await ctx.db
			.query('users')
			.withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
			.unique();

		const userId =
			existingUser?._id ??
			(await ctx.db.insert('users', {
				name: identity.name ?? 'Anonymous',
				email: identity.email,
				authId: identity.subject,
			}));

		// 1. Create the new thread
		const threadId = await ctx.db.insert('threads', {
			userId: userId,
			title: 'New Chat',
			isPublic: false,
		});

		// 2. Create the user's message
		await ctx.db.insert('messages', {
			threadId: threadId,
			role: 'user',
			content: args.messageContent,
			modelUsed: args.model,
		});

		// 3. Create the assistant's placeholder message
		const assistantMessageId = await ctx.db.insert('messages', {
			threadId: threadId,
			role: 'assistant',
			content: '',
			status: 'in_progress',
			modelUsed: args.model,
		});

		// 4. Schedule the AI action to fill in the placeholder
		await ctx.scheduler.runAfter(0, api.llm.generateResponse, {
			threadId: threadId,
			assistantMessageId: assistantMessageId,
			model: args.model,
		});

		// 5. Return the new thread's ID to the client
		return threadId;
	},
});
