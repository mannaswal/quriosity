import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getUser } from './users';
import { AttachmentType } from './schema';

/**
 * Insert a new attachment into the database
 */
export const insertAttachment = mutation({
	args: {
		filename: v.string(),
		originalFilename: v.string(),
		url: v.string(),
		mimeType: v.string(),
		type: AttachmentType,
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		return await ctx.db.insert('attachments', {
			userId: user._id,
			filename: args.filename,
			originalFilename: args.originalFilename,
			url: args.url,
			mimeType: args.mimeType,
			type: args.type,
		});
	},
});

/**
 * Get attachments by their IDs
 */
export const getAttachmentsByIds = query({
	args: { attachmentIds: v.array(v.id('attachments')) },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const attachments = [];
		for (const attachmentId of args.attachmentIds) {
			const attachment = await ctx.db.get(attachmentId);
			if (attachment && attachment.userId === user._id) {
				attachments.push(attachment);
			}
		}
		return attachments;
	},
});

/**
 * Get all attachments for a user
 */
export const getUserAttachments = query({
	handler: async (ctx) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		return await ctx.db
			.query('attachments')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.order('desc')
			.collect();
	},
});

/**
 * Delete an attachment and remove it from all messages that reference it
 */
export const deleteAttachment = mutation({
	args: { attachmentId: v.id('attachments') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const attachment = await ctx.db.get(args.attachmentId);
		if (!attachment || attachment.userId !== user._id) {
			throw new Error('Attachment not found or unauthorized');
		}

		// Find all messages that reference this attachment
		const allMessages = await ctx.db.query('messages').collect();
		const messagesToUpdate = allMessages.filter(
			(message) =>
				message.attachmentIds &&
				message.attachmentIds.includes(args.attachmentId)
		);

		// Remove the attachment ID from all messages that reference it
		for (const message of messagesToUpdate) {
			if (message.attachmentIds) {
				const updatedAttachmentIds = message.attachmentIds.filter(
					(id) => id !== args.attachmentId
				);
				await ctx.db.patch(message._id, {
					attachmentIds:
						updatedAttachmentIds.length > 0 ? updatedAttachmentIds : undefined,
				});
			}
		}

		// Delete the attachment
		await ctx.db.delete(args.attachmentId);
	},
});
