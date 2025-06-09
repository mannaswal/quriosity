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
export async function getMe(ctx: QueryCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		return null;
	}
	const user = await ctx.db
		.query('users')
		.withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
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
		if (!identity) {
			throw new Error('Called storeUser without authentication present');
		}

		// Check if we've already stored this identity before.
		const user = await getMe(ctx);
		if (user !== null) {
			// If we've seen this identity before but the name has changed, patch the value.
			if (user.name !== identity.name) {
				await ctx.db.patch(user._id, { name: identity.name });
			}
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
		return await getMe(ctx);
	},
});

/**
 * Update the last model used by the user.
 */
export const updateLastModelUsed = mutation({
	args: { model: v.string() },
	handler: async (ctx, { model }) => {
		const user = await getMe(ctx);
		if (!user) {
			throw new Error('User not found.');
		}
		return await ctx.db.patch(user._id, { lastModelUsed: model });
	},
});
