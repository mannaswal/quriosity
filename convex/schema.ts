// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const ThreadStatus = v.union(
	v.literal('pending'),
	v.literal('streaming'),
	v.literal('done'),
	v.literal('error')
);

const MessageRole = v.union(
	v.literal('user'),
	v.literal('assistant'),
	v.literal('system')
);

export const MessageStatus = v.union(
	v.literal('pending'),
	v.literal('streaming'),
	v.literal('done'),
	v.literal('error')
);

export const StopReason = v.union(
	v.literal('completed'),
	v.literal('stopped'),
	v.literal('error')
);

export default defineSchema({
	users: defineTable({
		name: v.string(),
		email: v.optional(v.string()),
		authId: v.string(),
		lastModelUsed: v.optional(v.string()),
	}).index('by_auth_id', ['authId']),

	threads: defineTable({
		userId: v.id('users'),
		title: v.string(),
		isPublic: v.boolean(),
		shareId: v.optional(v.string()),
		currentModel: v.optional(v.string()),
		pinned: v.optional(v.boolean()),
		parentThreadId: v.optional(v.id('threads')),
		parentMessageId: v.optional(v.id('messages')),
		status: ThreadStatus,
	})
		.index('by_user_id', ['userId'])
		.index('by_share_id', ['shareId'])
		.index('by_parent_thread_id', ['parentThreadId'])
		.index('by_parent_message_id', ['parentMessageId']),

	messages: defineTable({
		userId: v.id('users'),
		threadId: v.id('threads'),

		role: MessageRole,
		content: v.string(),
		status: MessageStatus,
		modelUsed: v.string(),
		stopReason: v.optional(StopReason),
	})
		.index('by_thread', ['threadId'])
		.index('by_user_id', ['userId']),
});
