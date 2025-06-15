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
import {
	DefaultAssistantMessage,
	DefaultUserMessage,
	MessageRole,
	MessageStatus,
	ReasoningEffort,
	StopReason,
} from './schema';
import { updateThreadStatus } from './threads';

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

export const insertMessage = internalMutation({
	args: {
		threadId: v.id('threads'),
		role: MessageRole,
		model: v.string(),
		reasoningEffort: v.optional(ReasoningEffort),
		content: v.optional(v.string()),
		reasoning: v.optional(v.string()),
		status: v.optional(MessageStatus),
		stopReason: v.optional(StopReason),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const message = {
			...(args.role === 'user' ? DefaultUserMessage : DefaultAssistantMessage),
			...args,
			userId: user._id,
			threadId: args.threadId,
			model: args.model,
		};

		return await ctx.db.insert('messages', message);
	},
});

/**
 * Insert messages into the database
 * @returns The array of inserted message IDs
 */
export const insertMessages = mutation({
	args: {
		threadId: v.id('threads'),
		messages: v.array(
			v.object({
				role: MessageRole,
				model: v.string(),
				reasoningEffort: v.optional(ReasoningEffort),
				content: v.optional(v.string()),
				reasoning: v.optional(v.string()),
				status: v.optional(MessageStatus),
				stopReason: v.optional(StopReason),
			})
		),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const insertedMessageIds: Id<'messages'>[] = [];

		args.messages.forEach(async (message) => {
			const insertedMessageId = await ctx.runMutation(
				internal.messages.insertMessage,
				{
					// Required fields
					threadId: args.threadId,
					role: message.role,
					model: message.model,
					// Optional fields
					reasoningEffort: message.reasoningEffort,
					content: message.content,
					reasoning: message.reasoning,
					status: message.status,
					stopReason: message.stopReason,
				}
			);
			insertedMessageIds.push(insertedMessageId);
		});

		return insertedMessageIds;
	},
});

/**
 * Updates a message, and optionally the thread status.
 * Returns true if the update was successful, false if the message is already done or error.
 * @param args.messageId - The ID of the message to update.
 * @param args.content - The content to update the message with (optional).
 * @param args.status - The status to update the message with (optional).
 * @param args.stopReason - The stop reason to update the message with (optional).
 * @returns True if the update was successful, false if the message is already done or error.
 */
export const updateMessage = mutation({
	args: {
		messageId: v.id('messages'),
		content: v.optional(v.string()),
		reasoning: v.optional(v.string()),
		status: v.optional(MessageStatus),
		stopReason: v.optional(StopReason),
	},
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const message = await ctx.db
			.query('messages')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.filter((q) => q.eq(q.field('_id'), args.messageId))
			.first();

		if (!message) return false;

		if (message.status === 'done' || message.status === 'error') {
			return false;
		}

		const patchData: any = {};
		if (args.status) patchData.status = args.status;
		if (args.stopReason) patchData.stopReason = args.stopReason;
		if (args.content) patchData.content = args.content;
		if (args.reasoning) patchData.reasoning = args.reasoning;

		await ctx.db.patch(args.messageId, patchData);

		if (args.status) {
			const threadStatus =
				args.status === 'reasoning' ? 'streaming' : args.status;
			await ctx.db.patch(message.threadId, { status: threadStatus });
		}

		return true;
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

		if (!message || message.userId !== user._id) {
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

		const modelUsed = userMessage.model;
		const reasoningEffortUsed = userMessage.reasoningEffort;

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

		await ctx.runMutation(internal.threads.updateThreadStatus, {
			threadId: userMessage.threadId,
			status: 'pending',
		});

		let assistantMessage = {
			...DefaultAssistantMessage,
			userId: user._id,
			threadId: userMessage.threadId,
			model: modelUsed,
			reasoningEffort: reasoningEffortUsed,
		};

		// Create a new placeholder message for the assistant
		const assistantMessageId = await ctx.db.insert(
			'messages',
			assistantMessage
		);

		return { assistantMessageId, assistantMessage, messages };
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

		const modelUsed = userMessage.model;
		const reasoningEffortUsed = userMessage.reasoningEffort;

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

		await ctx.runMutation(internal.threads.updateThreadStatus, {
			threadId: userMessage.threadId,
			status: 'pending',
		});

		// 3. Create a new placeholder message for the assistant
		let assistantMessage = {
			...DefaultAssistantMessage,
			userId: user._id,
			threadId: userMessage.threadId,
			model: modelUsed,
			reasoningEffort: reasoningEffortUsed,
		};

		// Create a new placeholder message for the assistant
		const assistantMessageId = await ctx.db.insert(
			'messages',
			assistantMessage
		);

		return { assistantMessageId, assistantMessage, messages };
	},
});
