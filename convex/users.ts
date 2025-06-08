import { mutation } from './_generated/server';

/**
 * Creates a new user in our database or retrieves an existing one.
 * Called on first login/interaction after Clerk authentication.
 */
export const storeUser = mutation({
	args: {}, // No args needed as Clerk identity comes from context
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error('Not authenticated');
		}

		const authId = identity.subject; // This is Clerk's user ID (e.g., 'user_123...')
		const name = identity.name || identity.nickname || identity.email; // Get a name if available
		const email = identity.email;

		const existingUser = await ctx.db
			.query('users')
			.withIndex('by_auth_id', (q) => q.eq('authId', authId))
			.unique();

		if (existingUser !== null) {
			// If we've seen this identity before but the name has changed, patch the value.
			if (existingUser.name !== identity.name) {
				await ctx.db.patch(existingUser._id, { name: identity.name });
			}
			return existingUser._id;
		}
		// If it's a new identity, create a new `User`.
		return await ctx.db.insert('users', {
			name: name ?? 'Anonymous',
			authId,
			email,
		});
	},
});
