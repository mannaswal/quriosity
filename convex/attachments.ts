import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { AttachmentType } from './schema';
import { getUser } from './users';

/**
 * Insert a new attachment record
 * Optionally adds the attachment to a project if projectId is provided
 * Supports textContent for text files
 */
export const insertAttachment = mutation({
	args: {
		filename: v.string(),
		url: v.string(),
		mimeType: v.string(),
		type: AttachmentType,
		key: v.string(),
		textContent: v.optional(v.string()),
		projectId: v.optional(v.id('projects')),
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
			textContent: args.textContent,
		});

		// If projectId is provided, add the attachment to the project
		if (args.projectId) {
			const project = await ctx.db.get(args.projectId);
			if (!project) throw new Error('Project not found');

			if (project.userId !== user._id) {
				throw new Error(
					'Unauthorized: You can only add attachments to your own projects'
				);
			}

			// Add attachment to project
			await ctx.db.patch(args.projectId, {
				attachmentIds: [...project.attachmentIds, attachmentId],
			});
		}

		return attachmentId;
	},
});

/**
 * Insert multiple attachment records
 * Optionally adds all attachments to a project if projectId is provided
 * Supports textContent for text files
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
				textContent: v.optional(v.string()),
			})
		),
		projectId: v.optional(v.id('projects')),
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

		// Verify project exists and user owns it if projectId is provided
		if (args.projectId) {
			const project = await ctx.db.get(args.projectId);
			if (!project) throw new Error('Project not found');

			if (project.userId !== user._id) {
				throw new Error(
					'Unauthorized: You can only add attachments to your own projects'
				);
			}

			await ctx.db.patch(args.projectId, {
				attachmentIds: [...project.attachmentIds, ...attachmentIds],
			});
		}

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
