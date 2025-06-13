import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
	QueryCtx,
	internalMutation,
	mutation,
	query,
} from './_generated/server';

/**
 * Get the user record for the currently authenticated user.
 */
export async function getUser(ctx: QueryCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Not authenticated');

	const authId = identity.subject;

	const user = await ctx.db
		.query('users')
		.withIndex('by_auth_id', (q) => q.eq('authId', authId))
		.unique();

	return user;
}

/**
 * Creates a new user in our database or retrieves an existing one.
 * Called on first login/interaction after Clerk authentication.
 */
export const storeUser = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Not authenticated');

		// Check if we've already stored this identity before.
		const user = await getUser(ctx);

		if (user) {
			if (user.name !== identity.name)
				await ctx.db.patch(user._id, { name: identity.name });

			return user._id;
		}

		// If it's a new identity, create a new user.
		return await ctx.db.insert('users', {
			name: identity.name!,
			email: identity.email,
			authId: identity.subject,
		});
	},
});

/**
 * Get the current user from the database.
 */
export const getCurrentUser = query({
	handler: async (ctx) => {
		return await getUser(ctx);
	},
});

/**
 * Update the last model used by the user.
 */
export const updateLastModelUsed = mutation({
	args: { model: v.string() },
	handler: async (ctx, { model }) => {
		const user = await getUser(ctx);
		if (!user) {
			throw new Error('User not found.');
		}
		return await ctx.db.patch(user._id, { lastModelUsed: model });
	},
});
