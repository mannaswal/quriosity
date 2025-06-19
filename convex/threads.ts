import {
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { getUser } from './users';
import {
	DefaultAssistantMessage,
	DefaultUserMessage,
	ReasoningEffort,
	ThreadStatus,
} from './schema';
import { ConvexError } from 'convex/values';

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

export const getThreadById = query({
	args: { threadId: v.optional(v.id('threads')) },
	handler: async (ctx, args) => {
		if (!args.threadId) return null;

		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const thread = await ctx.db.get(args.threadId);
		if (!thread) return null;

		if (thread.userId !== user._id) throw new Error('Unauthorized');

		return thread;
	},
});

export const getUserThreads = query({
	handler: async (ctx) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not found');

		return await ctx.db
			.query('threads')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.order('desc')
			.collect();
	},
});

/**
 * Search messages and return relevant threads with match highlights
 * Uses full-text search on message content to find relevant conversations
 */
export const searchThreadsByMessages = query({
	args: {
		searchQuery: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { searchQuery, limit = 50 }) => {
		const user = await getUser(ctx);
		if (!user) throw new ConvexError('Unauthorized');

		// Validate search query
		if (searchQuery.trim().length < 2) {
			return [];
		}

		// Search messages by content, filtered by current user
		const matchingMessages = await ctx.db
			.query('messages')
			.withSearchIndex('search_content', (q) =>
				q.search('content', searchQuery).eq('userId', user._id)
			)
			.take(limit);

		// Get unique thread IDs from matching messages
		const threadIds = [...new Set(matchingMessages.map((msg) => msg.threadId))];

		// Fetch the threads
		const threads = await Promise.all(threadIds.map((id) => ctx.db.get(id)));

		// Filter out null threads and add search metadata
		const threadsWithMatches = threads
			.filter((thread): thread is NonNullable<typeof thread> => thread !== null)
			.map((thread) => {
				const threadMessages = matchingMessages.filter(
					(msg) => msg.threadId === thread._id
				);
				return {
					...thread,
					matchingMessages: threadMessages.slice(0, 3), // Include first 3 matching messages
					totalMatches: threadMessages.length,
				};
			});

		// Sort by relevance (total matches) and then by creation time
		return threadsWithMatches.sort((a, b) => {
			if (a.totalMatches !== b.totalMatches) {
				return b.totalMatches - a.totalMatches;
			}
			return b._creationTime - a._creationTime;
		});
	},
});

/**
 * Internal action to generate a title for a thread based on the first message
 * Uses the Gemini lite model for fast, cost-effective title generation
 */
export const generateThreadTitle = internalAction({
	args: {
		threadId: v.id('threads'),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const { text } = await generateText({
				model: openrouter.chat('google/gemini-2.0-flash-lite-001'),
				system:
					'Generate a concise, descriptive title (max 60 characters) for a chat conversation based on the first user message. Return only the title, no quotes or additional text.',
				prompt: `Title the chat conversation based on the first user message: ${args.content}`,
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

export const updateThreadModel = mutation({
	args: {
		threadId: v.id('threads'),
		model: v.optional(v.string()),
		reasoningEffort: v.optional(ReasoningEffort),
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

		const patch: Record<string, string | typeof ReasoningEffort | boolean> = {};
		if (args.model) patch.model = args.model;
		if (args.reasoningEffort) patch.reasoningEffort = args.reasoningEffort;

		// Update the thread's current settings
		await ctx.db.patch(args.threadId, patch);
	},
});

export const createThread = mutation({
	args: {
		messageContent: v.string(),
		model: v.string(),
		reasoningEffort: v.optional(ReasoningEffort),
		attachmentIds: v.optional(v.array(v.id('attachments'))),
		projectId: v.optional(v.id('projects')),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('Not authenticated');

		// Verify project ownership if projectId is provided
		if (args.projectId) {
			const project = await ctx.db.get(args.projectId);
			if (!project) throw new Error('Project not found');
			if (project.userId !== user._id) throw new Error('Unauthorized');
		}

		// 1. Create the new thread with the initial model
		const threadId = await ctx.db.insert('threads', {
			userId: user._id,
			title: 'New Chat',
			isPublic: false,
			model: args.model,
			reasoningEffort: args.reasoningEffort,
			projectId: args.projectId,
			status: 'pending',
		});

		// 2. Schedule title generation to run concurrently (non-blocking)
		await ctx.scheduler.runAfter(0, internal.threads.generateThreadTitle, {
			threadId: threadId,
			content: args.messageContent,
		});

		// 3. Return the new thread's ID to the client
		return threadId;
	},
});

/**
 * Insert a new user and assistant message into a thread to prepare it for new message generation
 */
export const setupThread = mutation({
	args: {
		threadId: v.id('threads'),
		model: v.string(),
		reasoningEffort: v.optional(ReasoningEffort),
		useWebSearch: v.optional(v.boolean()),
		messageContent: v.string(),
		attachmentIds: v.optional(v.array(v.id('attachments'))),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('Not authenticated');

		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error('Thread not found');
		if (thread.userId !== user._id) throw new Error('Unauthorized');

		const userMessageId = await ctx.db.insert('messages', {
			...DefaultUserMessage,
			userId: user._id,
			threadId: args.threadId,
			model: args.model,
			reasoningEffort: args.reasoningEffort,
			useWebSearch: args.useWebSearch,
			content: args.messageContent,
			attachmentIds: args.attachmentIds || [],
		});

		const assistantMessageId = await ctx.db.insert('messages', {
			...DefaultAssistantMessage,
			userId: user._id,
			threadId: args.threadId,
			model: args.model,
			reasoningEffort: args.reasoningEffort,
			useWebSearch: args.useWebSearch,
		});

		const allMessages = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
			.filter((q) => q.neq(q.field('status'), 'pending'))
			.collect();

		return {
			userMessageId,
			assistantMessageId,
			allMessages,
		};
	},
});

/**
 * Delete a thread and all its associated messages
 * Only the thread owner can delete their threads
 */
export const deleteThread = mutation({
	args: { threadId: v.id('threads') },
	handler: async (ctx, { threadId }) => {
		const user = await getUser(ctx);
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
				.withIndex('by_parent_message_id', (q) =>
					q.eq('parentMessageId', message._id)
				)
				.collect();

			// Orphan child branches by clearing their parent reference
			for (const branch of childBranches) {
				await ctx.db.patch(branch._id, { parentMessageId: undefined });
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
		const user = await getUser(ctx);
		if (!user) throw new Error('Not authenticated');

		// Verify the thread exists and get the thread data
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error('Thread not found');

		// Verify the user owns this thread
		if (thread.userId !== user._id) throw new Error('Unauthorized');

		const patch: Record<string, boolean> = {
			pinned: args.pinned,
		};
		if (args.pinned && thread.archived) {
			patch.archived = false;
		}

		// Update the thread's pinned status
		await ctx.db.patch(args.threadId, patch);

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

/**
 * Toggle the archived status of a thread
 * Only the thread owner can archive/unarchive their threads
 */
export const archiveThread = mutation({
	args: {
		threadId: v.id('threads'),
		archived: v.boolean(),
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
			throw new Error(
				'Unauthorized: You can only archive/unarchive your own threads'
			);
		}

		// Update the thread's archived status
		await ctx.db.patch(args.threadId, {
			archived: args.archived,
		});

		return { success: true, archived: args.archived };
	},
});

export const branchFromMessage = mutation({
	args: { messageId: v.id('messages') },
	handler: async (ctx, { messageId }) => {
		const user = await getUser(ctx);
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
			model: sourceThread.model, // Copy model from parent
			reasoningEffort: sourceThread.reasoningEffort, // Copy reasoning from parent
			parentMessageId: messageId,
			status: 'done',
		});

		// 3. Copy messages to the new thread
		for (const message of messagesToCopy) {
			const { _id, _creationTime, ...rest } = message;
			await ctx.db.insert('messages', {
				...rest,
				threadId: newThreadId,
			});
		}

		return newThreadId;
	},
});

/**
 * Public mutation to update thread status
 * Only the thread owner can update their thread status
 */
export const updateThreadStatus = internalMutation({
	args: { threadId: v.id('threads'), status: ThreadStatus },
	handler: async (ctx, { threadId, status }) => {
		await ctx.db.patch(threadId, { status });
	},
});

export const stopThread = mutation({
	args: { threadId: v.id('threads') },
	handler: async (ctx, { threadId }) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const thread = await ctx.db.get(threadId);
		if (!thread || thread.userId !== user._id) {
			throw new Error('Thread not found or user not authorized');
		}

		await ctx.db.patch(threadId, { status: 'done' });

		const message = await ctx.db
			.query('messages')
			.withIndex('by_thread_and_status', (q) =>
				q.eq('threadId', threadId).eq('status', 'streaming')
			)
			.first();

		if (message) {
			await ctx.db.patch(message._id, {
				status: 'done',
				stopReason: 'stopped',
			});
		}
	},
});

/**
 * Internal mutation to set streaming state on a thread
 */
export const setStreaming = internalMutation({
	args: { threadId: v.id('threads'), status: ThreadStatus },
	handler: async (ctx, { threadId, status }) => {
		await ctx.db.patch(threadId, {
			status,
		});
	},
});

/**
 * Internal mutation to stop streaming on a thread
 */
export const stopStream = internalMutation({
	args: { threadId: v.id('threads') },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.threadId, { status: 'done' });
	},
});

/**
 * Query to get the single message with 'in_progress' status for a thread
 * Used to identify which message is currently streaming
 */
export const getStreamingMessage = query({
	args: { threadId: v.id('threads') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
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
			.filter((q) => q.eq(q.field('status'), 'streaming'))
			.first();
	},
});

/**
 * Update a thread's project assignment
 * Only the thread owner can update their thread's project
 */
export const updateThreadProject = mutation({
	args: {
		threadId: v.id('threads'),
		projectId: v.optional(v.id('projects')), // undefined to remove from project
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('Not authenticated');

		// Verify thread ownership
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error('Thread not found');
		if (thread.userId !== user._id) throw new Error('Unauthorized');

		// Verify project ownership if projectId is provided
		if (args.projectId) {
			const project = await ctx.db.get(args.projectId);
			if (!project) throw new Error('Project not found');
			if (project.userId !== user._id) throw new Error('Unauthorized');
		}

		await ctx.db.patch(args.threadId, {
			projectId: args.projectId,
		});

		return { success: true };
	},
});

/**
 * Toggle a thread's public sharing status
 * Generates or revokes a shareId based on the public status
 */
export const toggleThreadPublic = mutation({
	args: {
		threadId: v.id('threads'),
		isPublic: v.boolean(),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('Not authenticated');

		// Verify thread ownership
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error('Thread not found');
		if (thread.userId !== user._id) throw new Error('Unauthorized');

		// Generate shareId if making public, clear if making private
		const shareId = args.isPublic ? crypto.randomUUID() : undefined;

		await ctx.db.patch(args.threadId, {
			isPublic: args.isPublic,
			shareId: shareId,
		});

		return { success: true, shareId };
	},
});

/**
 * Revoke thread sharing by making it private
 */
export const revokeThreadShare = mutation({
	args: {
		threadId: v.id('threads'),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('Not authenticated');

		// Verify thread ownership
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error('Thread not found');
		if (thread.userId !== user._id) throw new Error('Unauthorized');

		await ctx.db.patch(args.threadId, {
			isPublic: false,
			shareId: undefined,
		});

		return { success: true };
	},
});

/**
 * Get public thread by shareId (no authentication required)
 * Returns sanitized thread data for sharing
 */
export const getPublicThreadByShareId = query({
	args: { shareId: v.string() },
	handler: async (ctx, args) => {
		const thread = await ctx.db
			.query('threads')
			.withIndex('by_share_id', (q) => q.eq('shareId', args.shareId))
			.filter((q) => q.eq(q.field('isPublic'), true))
			.unique();

		if (!thread) return null;

		// Return sanitized thread data
		return {
			_id: thread._id,
			_creationTime: thread._creationTime,
			title: thread.title,
			shareId: thread.shareId!,
			model: thread.model,
			reasoningEffort: thread.reasoningEffort,
			status: thread.status,
		};
	},
});

/**
 * Get messages for a public thread (no authentication required)
 * Returns sanitized message data with converted attachments
 */
export const getPublicThreadMessages = query({
	args: { shareId: v.string() },
	handler: async (ctx, args) => {
		// First verify the thread exists and is public
		const thread = await ctx.db
			.query('threads')
			.withIndex('by_share_id', (q) => q.eq('shareId', args.shareId))
			.filter((q) => q.eq(q.field('isPublic'), true))
			.unique();

		if (!thread) return null;

		// Get all messages for the thread
		const messages = await ctx.db
			.query('messages')
			.withIndex('by_thread', (q) => q.eq('threadId', thread._id))
			.order('asc')
			.collect();

		// Convert messages with attachment IDs to public format with attachment data
		const publicMessages = await Promise.all(
			messages.map(async (message) => {
				let attachments: Array<{
					filename: string;
					url: string;
					mimeType: string;
					type: 'text' | 'image' | 'pdf';
				}> = [];

				// Convert attachment IDs to attachment data
				if (message.attachmentIds && message.attachmentIds.length > 0) {
					const attachmentDocs = await Promise.all(
						message.attachmentIds.map((id) => ctx.db.get(id))
					);

					attachments = attachmentDocs
						.filter((doc) => doc !== null)
						.map((attachment) => ({
							filename: attachment.filename,
							url: attachment.url,
							mimeType: attachment.mimeType,
							type: attachment.type,
						}));
				}

				// Return sanitized message data
				return {
					_id: message._id,
					_creationTime: message._creationTime,
					threadId: message.threadId,
					content: message.content,
					reasoning: message.reasoning,
					role: message.role,
					status: message.status,
					stopReason: message.stopReason,
					model: message.model,
					reasoningEffort: message.reasoningEffort,
					useWebSearch: message.useWebSearch,
					attachments,
				};
			})
		);

		return publicMessages;
	},
});
