// convex/schema.ts
import { metadata } from '@/app/layout';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const ThreadStatus = v.union(
	v.literal('pending'), // Thread is waiting to be processed, created
	v.literal('streaming'), // Thread is being processed, streaming
	v.literal('done'), // Thread is done, all content has been received
	v.literal('error') // Thread errored, something went wrong
);

export const MessageStatus = v.union(
	v.literal('pending'),
	v.literal('streaming'),
	v.literal('done'),
	v.literal('error'),
	v.literal('reasoning')
);

export const MessageRole = v.union(
	v.literal('user'),
	v.literal('assistant'),
	v.literal('system')
);

export const StopReason = v.union(
	v.literal('completed'),
	v.literal('stopped'),
	v.literal('error')
);

export const ReasoningEffort = v.union(
	v.literal('low'),
	v.literal('medium'),
	v.literal('high')
);

export const AttachmentType = v.union(
	v.literal('text'),
	v.literal('image'),
	v.literal('pdf')
);

export default defineSchema({
	users: defineTable({
		name: v.optional(v.string()),
		email: v.optional(v.string()),
		authId: v.string(),

		lastModelUsed: v.optional(v.string()),
		lastReasoningEffortUsed: v.optional(ReasoningEffort),
		useWebSearch: v.optional(v.boolean()),
	}).index('by_auth_id', ['authId']),

	projects: defineTable({
		userId: v.id('users'),
		name: v.string(),
		systemPrompt: v.string(),
		attachmentIds: v.array(v.id('attachments')),
	}).index('by_user_id', ['userId']),

	attachments: defineTable({
		userId: v.id('users'),
		filename: v.string(),
		url: v.string(),
		mimeType: v.string(),
		type: AttachmentType,
		key: v.string(),

		textContent: v.optional(v.string()),
	}).index('by_user_id', ['userId']),

	threads: defineTable({
		userId: v.id('users'),
		title: v.string(),
		isPublic: v.boolean(),
		shareId: v.optional(v.string()),
		model: v.string(),
		reasoningEffort: v.optional(ReasoningEffort),
		pinned: v.optional(v.boolean()),
		archived: v.optional(v.boolean()),
		projectId: v.optional(v.id('projects')),
		parentMessageId: v.optional(v.id('messages')),
		status: ThreadStatus,
	})
		.index('by_user_id', ['userId'])
		.index('by_share_id', ['shareId'])
		.index('by_project_id', ['projectId'])
		.index('by_parent_message_id', ['parentMessageId']),

	messages: defineTable({
		userId: v.id('users'),
		threadId: v.id('threads'),

		content: v.string(),
		reasoning: v.optional(v.string()),
		role: MessageRole,
		status: MessageStatus,
		stopReason: v.optional(StopReason),

		model: v.string(),
		reasoningEffort: v.optional(ReasoningEffort),
		useWebSearch: v.optional(v.boolean()),

		attachmentIds: v.optional(v.array(v.id('attachments'))),
	})
		.index('by_user_id', ['userId'])
		.index('by_thread', ['threadId'])
		.index('by_thread_and_status', ['threadId', 'status']),
});

export const DefaultUserMessage = {
	role: 'user' as const,
	content: '',
	status: 'done' as const,
};

export const DefaultAssistantMessage = {
	role: 'assistant' as const,
	content: '',
	reasoning: '',
	status: 'pending' as const,
};
