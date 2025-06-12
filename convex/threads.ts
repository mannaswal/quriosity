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
import { getMe } from './users';

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
			.order('desc')
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

export const createThread = mutation({
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

		if (!existingUser) {
			throw new Error('User not found');
		}

		const userId = existingUser._id;

		// 1. Create the new thread with the initial model
		const threadId = await ctx.db.insert('threads', {
			userId: userId,
			title: 'New Chat',
			isPublic: false,
			currentModel: args.model,
		});

		// 2. Schedule title generation to run concurrently (non-blocking)
		await ctx.scheduler.runAfter(0, internal.threads.generateThreadTitle, {
			threadId: threadId,
			firstMessage: args.messageContent,
		});

		// 3. Return the new thread's ID to the client
		return threadId;
	},
});

/**
 * Delete a thread and all its associated messages
 * Only the thread owner can delete their threads
 */
export const deleteThread = mutation({
	args: { threadId: v.id('threads') },
	handler: async (ctx, { threadId }) => {
		const user = await getMe(ctx);
		if (!user) {
			throw new Error('User not authenticated.');
		}

		const thread = await ctx.db.get(threadId);
		if (!thread || thread.userId !== user._id) {
			throw new Error('Thread not found or user not authorized.');
		}

		// First, find all messages in the thread to be deleted
		const messages = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', threadId))
			.collect();

		// For each message, find and orphan any threads that branch from it
		for (const message of messages) {
			const childBranches = await ctx.db
				.query('threads')
				.withIndex('by_branch_source', (q) =>
					q.eq('branchedFromMessageId', message._id)
				)
				.collect();

			for (const branch of childBranches) {
				await ctx.db.patch(branch._id, { branchedFromMessageId: undefined });
			}
		}

		// Now, delete all messages in the thread
		for (const message of messages) {
			await ctx.db.delete(message._id);
		}

		// Finally, delete the thread itself
		await ctx.db.delete(threadId);
	},
});

/**
 * Toggle the pinned status of a thread
 * Only the thread owner can pin/unpin their threads
 */
export const pinThread = mutation({
	args: {
		threadId: v.id('threads'),
		pinned: v.boolean(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		// Verify the thread exists and get the thread data
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error('Thread not found');

		// Verify the user owns this thread
		const user = await ctx.db
			.query('users')
			.withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
			.unique();

		if (!user || thread.userId !== user._id) {
			throw new Error('Unauthorized: You can only pin/unpin your own threads');
		}

		// Update the thread's pinned status
		await ctx.db.patch(args.threadId, {
			pinned: args.pinned,
		});

		return { success: true, pinned: args.pinned };
	},
});

/**
 * Rename a thread's title
 * Only the thread owner can rename their threads
 */
export const renameThread = mutation({
	args: {
		threadId: v.id('threads'),
		newTitle: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		// Validate the new title
		if (!args.newTitle.trim()) {
			throw new Error('Thread title cannot be empty');
		}

		if (args.newTitle.length > 100) {
			throw new Error('Thread title cannot exceed 100 characters');
		}

		// Verify the thread exists and get the thread data
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error('Thread not found');

		// Verify the user owns this thread
		const user = await ctx.db
			.query('users')
			.withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
			.unique();

		if (!user || thread.userId !== user._id) {
			throw new Error('Unauthorized: You can only rename your own threads');
		}

		// Update the thread's title
		await ctx.db.patch(args.threadId, {
			title: args.newTitle.trim(),
		});

		return { success: true, newTitle: args.newTitle.trim() };
	},
});

export const branchFromMessage = mutation({
	args: { messageId: v.id('messages') },
	handler: async (ctx, { messageId }) => {
		const user = await getMe(ctx);
		if (!user) {
			throw new Error('User not authenticated.');
		}

		const sourceMessage = await ctx.db.get(messageId);
		if (!sourceMessage) {
			throw new Error('Source message not found.');
		}

		const sourceThread = await ctx.db.get(sourceMessage.threadId);
		if (!sourceThread || sourceThread.userId !== user._id) {
			throw new Error('User not authorized to branch from this thread.');
		}

		// 1. Get all messages up to the branch point
		const messagesToCopy = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', sourceThread._id))
			.filter((q) =>
				q.lte(q.field('_creationTime'), sourceMessage._creationTime)
			)
			.order('asc')
			.collect();

		// 2. Create the new thread
		const newThreadId = await ctx.db.insert('threads', {
			userId: user._id,
			title: sourceThread.title, // Copy title from parent
			isPublic: false,
			currentModel: sourceThread.currentModel, // Copy model from parent
			branchedFromMessageId: messageId,
		});

		// 3. Copy messages to the new thread
		for (const message of messagesToCopy) {
			// We intentionally don't copy the _id and _creationTime
			await ctx.db.insert('messages', {
				threadId: newThreadId,
				parentId: message.parentId,
				role: message.role,
				content: message.content,
				status: message.status,
				modelUsed: message.modelUsed,
			});
		}

		return newThreadId;
	},
});

/**
 * Internal mutation to set streaming state on a thread
 */
export const setStreaming = internalMutation({
	args: { threadId: v.id('threads'), isStreaming: v.boolean() },
	returns: v.null(),
	handler: async (ctx, { threadId, isStreaming }) => {
		await ctx.db.patch(threadId, { isStreaming });
		return null;
	},
});

/**
 * Internal mutation to stop streaming on a thread
 */
export const stopStream = internalMutation({
	args: { threadId: v.id('threads') },
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.threadId, { isStreaming: false });
		return null;
	},
});

/**
 * Query to get the single message with 'in_progress' status for a thread
 * Used to identify which message is currently streaming
 */
export const getStreamingMessage = query({
	args: { threadId: v.id('threads') },
	returns: v.union(
		v.object({
			_id: v.id('messages'),
			_creationTime: v.number(),
			threadId: v.id('threads'),
			parentId: v.optional(v.id('messages')),
			role: v.union(v.literal('user'), v.literal('assistant')),
			content: v.string(),
			status: v.optional(
				v.union(
					v.literal('in_progress'),
					v.literal('complete'),
					v.literal('error')
				)
			),
			modelUsed: v.string(),
			stopReason: v.optional(
				v.union(
					v.literal('completed'),
					v.literal('stopped'),
					v.literal('error')
				)
			),
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const user = await getMe(ctx);
		if (!user) {
			return null;
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== user._id) {
			return null;
		}

		return await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
			.filter((q) => q.eq(q.field('status'), 'in_progress'))
			.first();
	},
});
