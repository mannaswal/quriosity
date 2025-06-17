import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { AttachmentType } from './schema';
import { getUser } from './users';

/**
 * Insert a new attachment record
 */
export const insertAttachment = mutation({
	args: {
		filename: v.string(),
		url: v.string(),
		mimeType: v.string(),
		type: AttachmentType,
		key: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not found');

		const attachmentId = await ctx.db.insert('attachments', {
			userId: user._id,
			filename: args.filename,
			url: args.url,
			mimeType: args.mimeType,
			type: args.type,
			key: args.key,
		});

		return attachmentId;
	},
});

/**
 * Insert new attachment records
 */
export const insertAttachments = mutation({
	args: {
		attachments: v.array(
			v.object({
				filename: v.string(),
				url: v.string(),
				mimeType: v.string(),
				type: AttachmentType,
				key: v.string(),
			})
		),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not found');

		const attachmentIds = await Promise.all(
			args.attachments.map((attachment) =>
				ctx.db.insert('attachments', {
					userId: user._id,
					...attachment,
				})
			)
		);

		return attachmentIds;
	},
});

/**
 * Get attachment by ID
 */
export const getAttachment = query({
	args: { id: v.id('attachments') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

/**
 * Get multiple attachments by IDs
 */
export const getAttachmentsByIds = query({
	args: { ids: v.array(v.id('attachments')) },
	handler: async (ctx, args) => {
		const attachments = await Promise.all(args.ids.map((id) => ctx.db.get(id)));

		// Filter out any null values (deleted attachments)
		return attachments.filter((att) => att !== null);
	},
});

/**
 * Get all attachments for a user
 */
export const getUserAttachments = query({
	args: {},
	handler: async (ctx) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not found');
		return await ctx.db
			.query('attachments')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.collect();
	},
});

/**
 * Delete an attachment (only owner can delete)
 */
export const deleteAttachment = mutation({
	args: { id: v.id('attachments') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not found');

		const attachment = await ctx.db.get(args.id);
		if (!attachment) throw new Error('Attachment not found');

		// Only the owner can delete
		if (attachment.userId !== user._id) {
			throw new Error('Unauthorized: You can only delete your own files');
		}

		await ctx.db.delete(args.id);
		return { success: true };
	},
});
