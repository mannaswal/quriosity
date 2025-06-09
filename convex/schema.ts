// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

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
		branchedFromMessageId: v.optional(v.id('messages')),
	})
		.index('by_user', ['userId'])
		.index('by_share_id', ['shareId'])
		.index('by_branch_source', ['branchedFromMessageId']),

	messages: defineTable({
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
	}).index('by_thread', ['threadId']),
});
