// convex/messages.ts
import { v } from 'convex/values';
import {
	internalMutation,
	mutation,
	query,
	internalAction,
} from './_generated/server';
import { api, internal } from './_generated/api';
import { getUser } from './users';
import { Doc, Id } from './_generated/dataModel';
import { setStreamStopFlag } from './redis';
import { MessageRole, MessageStatus } from './schema';

export const getMessagesByThread = query({
	args: { threadId: v.id('threads') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		return await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
			.collect();
	},
});

/**
 * Insert messages into the database
 */
export const insertMessages = mutation({
	args: {
		threadId: v.id('threads'),
		messages: v.array(
			v.object({
				content: v.string(),
				modelUsed: v.string(),
				role: MessageRole,
				status: MessageStatus,
			})
		),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const insertedMessageIds: Id<'messages'>[] = [];

		args.messages.forEach(async (message) => {
			const insertedMessageId = await ctx.db.insert('messages', {
				userId: user._id,
				threadId: args.threadId,

				content: message.content,
				modelUsed: message.modelUsed,
				role: message.role,
				status: message.status,
			});
			insertedMessageIds.push(insertedMessageId);
		});

		return {
			messages: await ctx.db
				.query('messages')
				.withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
				.filter((q) => q.neq(q.field('status'), 'pending'))
				.collect(),
			insertedMessageIds,
		};
	},
});

export const updateMessage = mutation({
	args: {
		messageId: v.id('messages'),
		content: v.string(),
		status: MessageStatus,
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const message = await ctx.db
			.query('messages')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.filter((q) => q.eq(q.field('_id'), args.messageId))
			.first();

		if (!message) throw new Error('Message not found');

		await ctx.db.patch(args.messageId, {
			content: args.content,
			status: args.status,
		});
	},
});

/**
 * Finalize a streaming message with complete content and final status
 * This is the ONLY time the assistant message gets its content - when the stream is complete
 */
export const finalizeStream = internalMutation({
	args: {
		messageId: v.id('messages'),
		content: v.string(),
		status: v.union(v.literal('complete'), v.literal('error')),
		stopReason: v.optional(
			v.union(v.literal('completed'), v.literal('stopped'), v.literal('error'))
		),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error('Message not found');
		}

		// Use provided stopReason or derive from status
		const stopReason =
			args.stopReason || (args.status === 'complete' ? 'completed' : 'error');

		await Promise.all([
			// 1. Update message content with the FULL assembled content
			ctx.db.patch(args.messageId, {
				content: args.content,
				status: args.status,
				stopReason: stopReason,
			}),
			// 2. Update thread streaming state
			ctx.db.patch(message.threadId, { isStreaming: false }),
		]);

		return null;
	},
});

// Note: The old appendContent function has been removed
// In the new architecture, we only write complete content once via finalizeStream
// Edge Functions now call Convex via HTTP actions instead of public mutations

// Marks the message as fully complete
export const markComplete = internalMutation({
	args: { messageId: v.id('messages') },
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return;

		await Promise.all([
			ctx.db.patch(args.messageId, {
				status: 'complete',
				stopReason: 'completed',
			}),
			ctx.db.patch(message.threadId, { isStreaming: false }),
		]);
	},
});

// Marks the message with an error status
export const markError = internalMutation({
	args: { messageId: v.id('messages') },
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return;

		await Promise.all([
			ctx.db.patch(args.messageId, {
				status: 'error',
				stopReason: 'error',
			}),
			ctx.db.patch(message.threadId, { isStreaming: false }),
		]);
	},
});

// Marks the message as stopped by user
export const markStopped = internalMutation({
	args: { messageId: v.id('messages') },
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return;

		await Promise.all([
			ctx.db.patch(args.messageId, {
				status: 'complete',
				stopReason: 'stopped',
			}),
			ctx.db.patch(message.threadId, { isStreaming: false }),
		]);
	},
});

// Action to set the stop flag in Redis.
// This is an action because it performs a side effect (calling an external service).
export const _requestStopStreamAction = internalAction({
	args: { messageId: v.id('messages') },
	handler: async (_, { messageId }) => {
		await setStreamStopFlag(messageId);
	},
});

// Public mutation to stop a stream
export const requestStopStream = mutation({
	args: { threadId: v.id('threads') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) {
			throw new Error('User not authenticated.');
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== user._id) {
			throw new Error('Thread not found or user not authorized.');
		}

		// Find the in-progress message for the thread
		const inProgressMessage = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
			.filter((q) => q.eq(q.field('status'), 'in_progress'))
			.first();

		if (inProgressMessage) {
			// Schedule an action to set the Redis stop flag.
			// We use an action because mutations can't have side effects.
			await ctx.scheduler.runAfter(
				0,
				internal.messages._requestStopStreamAction,
				{
					messageId: inProgressMessage._id,
				}
			);
		}
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
	args: { messageId: v.id('messages') },
	handler: async (ctx, { messageId }) => {
		const user = await getUser(ctx);
		if (!user) {
			throw new Error('User not authenticated.');
		}

		let userMessage: Doc<'messages'>;

		const message = await ctx.db.get(messageId);

		if (!message) {
			throw new Error('Message not found.');
		}

		if (message.role === 'user') {
			userMessage = message;
		} else {
			// Meaning an assistant triggered this mutation, so we must get the previous message which is the user message
			const messages = await ctx.db
				.query('messages')
				.withIndex('by_thread', (q) => q.eq('threadId', message.threadId))
				.filter((q) => q.lt(q.field('_creationTime'), message._creationTime))
				.collect();

			userMessage = messages[messages.length - 1];

			if (!userMessage || userMessage.role !== 'user') {
				throw new Error('User message not found.');
			}
		}

		const thread = await ctx.db.get(message.threadId);
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

		const messages = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', userMessage.threadId))
			.collect();

		// Set thread as streaming
		await ctx.db.patch(userMessage.threadId, { isStreaming: true });

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
			messages,
		};
	},
});

export const editAndResubmit = mutation({
	args: { userMessageId: v.id('messages'), newContent: v.string() },
	handler: async (ctx, { userMessageId, newContent }) => {
		const user = await getUser(ctx);
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

		const messages = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', userMessage.threadId))
			.collect();

		// Set thread as streaming
		await ctx.db.patch(userMessage.threadId, { isStreaming: true });

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
			messages,
		};
	},
});
