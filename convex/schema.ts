import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	users: defineTable({
		authId: v.string(),
		name: v.string(),
		email: v.optional(v.string()),
	}).index('by_auth_id', ['authId']),
});
