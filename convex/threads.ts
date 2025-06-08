import {
	internalAction,
	internalMutation,
	mutation,
	query,
} from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Internal action to generate a title for a thread based on the first message
 * Uses the Gemini lite model for fast, cost-effective title generation
 */
export const generateThreadTitle = internalAction({
	args: {
		threadId: v.id('threads'),
		firstMessage: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const { text } = await generateText({
				model: openrouter.chat('google/gemini-2.0-flash-lite-001'),
				system:
					'Generate a concise, descriptive title (max 60 characters) for a chat conversation based on the first user message. Return only the title, no quotes or additional text.',
				prompt: `Title the chat conversation based on the first user message: ${args.firstMessage}`,
				maxTokens: 20,
				temperature: 0,
			});

			// Update the thread title with the generated title
			await ctx.runMutation(internal.threads.updateThreadTitle, {
				threadId: args.threadId,
				title: text.trim(),
			});
		} catch (error) {
			console.error('Failed to generate thread title:', error);
			// If title generation fails, we'll just keep the default "New Chat" title
		}
	},
});

/**
 * Internal mutation to update a thread's title
 */
export const updateThreadTitle = internalMutation({
	args: {
		threadId: v.id('threads'),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.threadId, {
			title: args.title,
		});
	},
});

export const getUserThreads = query({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		const user = await ctx.db
			.query('users')
			.withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
			.unique();

		if (!user) throw new Error('User not found');

		return await ctx.db
			.query('threads')
			.withIndex('by_user', (q) => q.eq('userId', user._id))
			.collect();
	},
});

export const getThread = query({
	args: { threadId: v.id('threads') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.threadId);
	},
});

export const updateThreadModel = mutation({
	args: {
		threadId: v.id('threads'),
		model: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		// Verify the user owns this thread
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error('Thread not found');

		const user = await ctx.db
			.query('users')
			.withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
			.unique();

		if (!user || thread.userId !== user._id) {
			throw new Error('Unauthorized');
		}

		// Update the thread's current model
		await ctx.db.patch(args.threadId, {
			currentModel: args.model,
		});
	},
});

export const listByThread = query({
	args: { threadId: v.id('threads') },
	handler: async (ctx, args) => {
		console.time('listByThread');
		const messages = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
			.collect();
		console.timeEnd('listByThread');
		return messages;
	},
});

export const createThreadAndPrepareForStream = mutation({
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

		// 1. Create the new thread with the initial model
		const threadId = await ctx.db.insert('threads', {
			userId: userId,
			title: 'New Chat',
			isPublic: false,
			currentModel: args.model,
		});

		// 2. Create the user message and assistant placeholder
		await ctx.db.insert('messages', {
			threadId: threadId,
			role: 'user',
			content: args.messageContent,
			modelUsed: args.model,
		});

		const assistantMessageId = await ctx.db.insert('messages', {
			threadId: threadId,
			role: 'assistant',
			content: '',
			status: 'in_progress',
			modelUsed: args.model,
		});

		// 3. Schedule title generation to run concurrently (non-blocking)
		await ctx.scheduler.runAfter(0, internal.threads.generateThreadTitle, {
			threadId: threadId,
			firstMessage: args.messageContent,
		});

		// 4. Return the new thread's and assistant message's ID to the client
		return { threadId, assistantMessageId };
	},
});
