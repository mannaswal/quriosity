// convex/messages.ts
import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
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
		const message = await ctx.db.get(args.messageId);

		if (!message) {
			console.log('[CONVEX] Message not found, returning false');
			return false; // Message may have been deleted during the update
		}

		if (message.status === 'done' || message.status === 'error') {
			return false;
		}

		const patchData = {
			...(args.status && { status: args.status }),
			...(args.stopReason && { stopReason: args.stopReason }),
			...(args.content && { content: args.content }),
			...(args.reasoning && { reasoning: args.reasoning }),
		};

		// console.log('[CONVEX] Patching message with data', patchData.status);
		await ctx.db.patch(args.messageId, patchData);

		if (args.status && message.status !== args.status) {
			const threadStatus =
				args.status === 'reasoning' ? 'streaming' : args.status;
			// Make sure thread hasn't been deleted
			await ctx.db.patch(message.threadId, { status: threadStatus });
		}

		return true;
	},
});

export const regenerateResponse = mutation({
	args: {
		messageId: v.id('messages'),
		updatedModel: v.optional(v.string()),
		updatedReasoningEffort: v.optional(ReasoningEffort),
	},
	handler: async (ctx, { messageId, updatedModel, updatedReasoningEffort }) => {
		const user = await getUser(ctx);
		if (!user) {
			throw new Error('User not authenticated.');
		}

		// will store the user message
		let userMessage: Doc<'messages'>;

		const message = await ctx.db.get(messageId);

		if (!message) throw new Error('Message not found.');
		if (message.userId !== user._id)
			throw new Error('User not authorized to access this message.');

		// if there is an updated model, use it, otherwise use the original model
		const modelUsed = updatedModel ? updatedModel : message.model;

		// if there is an updated model, but no updated reasoning effort, that must be intentional
		// needs to be set to a new value or unset
		const reasoningEffortUsed = updatedModel
			? updatedReasoningEffort
			: message.reasoningEffort;

		if (message.role === 'user') {
			// if the message that initiated this mutation is a user message, use it
			userMessage = message;
		} else {
			// Meaning an assistant triggered this mutation,
			// so we must get the previous message which is the user message
			const messages = await ctx.db
				.query('messages')
				.withIndex('by_thread', (q) => q.eq('threadId', message.threadId))
				.filter(
					(q) =>
						q.eq(q.field('role'), 'user') &&
						q.lt(q.field('_creationTime'), message._creationTime)
				)
				.collect();

			userMessage = messages[messages.length - 1];

			if (!userMessage) throw new Error('User message not found.');
			if (userMessage.role !== 'user') throw new Error('Invalid user message.');
		}

		// if the model or reasoning effort has been updated, update the user message
		if (
			userMessage.model !== modelUsed ||
			userMessage.reasoningEffort !== reasoningEffortUsed
		) {
			await ctx.db.patch(userMessage._id, {
				model: modelUsed,
				reasoningEffort: reasoningEffortUsed,
			});
		}

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
	args: {
		userMessageId: v.id('messages'),
		newContent: v.string(),
		updatedModel: v.optional(v.string()),
		updatedReasoningEffort: v.optional(ReasoningEffort),
	},
	handler: async (
		ctx,
		{ userMessageId, newContent, updatedModel, updatedReasoningEffort }
	) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated.');

		const userMessage = await ctx.db.get(userMessageId);

		if (!userMessage) throw new Error('Invalid user message ID.');
		if (userMessage.role !== 'user')
			throw new Error('Invalid user message ID.');

		const thread = await ctx.db.get(userMessage.threadId);

		if (!thread) throw new Error('Thread not found.');
		if (thread.userId !== user._id)
			throw new Error('User not authorized to access this thread.');

		// if there is an updated model, use it, otherwise use the original model
		const modelUsed = updatedModel ? updatedModel : userMessage.model;

		// if there is an updated model, but no updated reasoning effort, that must be intentional
		// needs to be set to a new value or unset
		const reasoningEffortUsed = updatedModel
			? updatedReasoningEffort
			: userMessage.reasoningEffort;

		// 1. Update the user's message content
		await ctx.db.patch(userMessage._id, {
			content: newContent,
			model: modelUsed,
			reasoningEffort: reasoningEffortUsed,
		});

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

export const markMessageAsStopped = mutation({
	args: {
		messageId: v.id('messages'),
		content: v.optional(v.string()),
		reasoning: v.optional(v.string()),
	},
	handler: async (ctx, { messageId, content, reasoning }) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const message = await ctx.db.get(messageId);
		if (!message) throw new Error('Message not found.');
		if (message.userId !== user._id)
			throw new Error('User not authorized to access this message.');

		await ctx.db.patch(messageId, {
			status: 'done',
			stopReason: 'stopped',
			content,
			reasoning,
		});

		const thread = await ctx.db.get(message.threadId);

		if (thread && thread.status !== 'done')
			await ctx.db.patch(message.threadId, { status: 'done' });
	},
});

export const markMessageAsError = mutation({
	args: { messageId: v.id('messages') },
	handler: async (ctx, { messageId }) => {
		console.log('[CONVEX] markMessageAsError called for messageId:', messageId);

		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const message = await ctx.db.get(messageId);
		if (!message) throw new Error('Message not found.');
		if (message.userId !== user._id)
			throw new Error('User not authorized to access this message.');

		console.log(
			'[CONVEX] markMessageAsError: Setting message to error status. Previous status was:',
			message.status
		);
		await ctx.db.patch(messageId, { status: 'error', stopReason: 'error' });

		const thread = await ctx.db.get(message.threadId);
		if (thread && thread.status !== 'error')
			await ctx.db.patch(message.threadId, { status: 'error' });
	},
});
