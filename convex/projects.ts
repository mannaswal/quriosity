import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getUser } from './users';

/**
 * Get all projects for the authenticated user
 */
export const getUserProjects = query({
	handler: async (ctx) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		return await ctx.db
			.query('projects')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.order('desc')
			.collect();
	},
});

/**
 * Get a specific project by ID
 * Only the project owner can access their project
 */
export const getProjectById = query({
	args: { projectId: v.id('projects') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const project = await ctx.db.get(args.projectId);
		if (!project) throw new Error('Project not found');

		if (project.userId !== user._id) {
			throw new Error('Unauthorized: You can only access your own projects');
		}

		return project;
	},
});

/**
 * Get a specific project by ID
 * Only the project owner can access their project
 */
export const getProjectDataById = query({
	args: { projectId: v.id('projects') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		const project = await ctx.db.get(args.projectId);
		if (!project) throw new Error('Project not found');

		if (project.userId !== user._id)
			throw new Error('Unauthorized: You can only access your own projects');

		const attachments = await Promise.all(
			project.attachmentIds.map(async (id) => {
				try {
					return await ctx.db.get(id);
				} catch {
					return null;
				}
			})
		).then((attachments) => attachments.filter((a) => a !== null));

		return { ...project, attachments };
	},
});

/**
 * Get project data by thread ID - includes project details and attachments
 * Returns null if thread doesn't belong to a project or user doesn't own it
 */
export const getProjectDataByThreadId = query({
	args: { threadId: v.id('threads') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) return null;

		// Get the thread
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error('Thread not found');
		if (thread.userId !== user._id) throw new Error('Unauthorized');

		// If the thread doesn't belong to a project, return null
		if (!thread.projectId) return null;

		// Get the project
		const project = await ctx.db.get(thread.projectId);
		if (!project) throw new Error('Project not found');
		if (project.userId !== user._id) throw new Error('Unauthorized');

		// Get project attachments
		const projectAttachments = await Promise.all(
			project.attachmentIds.map(async (id) => {
				try {
					return await ctx.db.get(id);
				} catch {
					return null;
				}
			})
		).then((attachments) => attachments.filter((a) => a !== null));

		return {
			...project,
			attachments: projectAttachments,
		};
	},
});

/**
 * Get threads that belong to a specific project
 * Only the project owner can access threads in their project
 */
export const getProjectThreads = query({
	args: { projectId: v.id('projects') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		// Verify project exists and user owns it
		const project = await ctx.db.get(args.projectId);
		if (!project) throw new Error('Project not found');

		if (project.userId !== user._id) {
			throw new Error('Unauthorized: You can only access your own projects');
		}

		return await ctx.db
			.query('threads')
			.withIndex('by_project_id', (q) => q.eq('projectId', args.projectId))
			.order('desc')
			.collect();
	},
});

/**
 * Create a new project
 */
export const createProject = mutation({
	args: {
		name: v.string(),
		systemPrompt: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		// Validate project name
		if (!args.name.trim()) {
			throw new Error('Project name cannot be empty');
		}

		if (args.name.length > 100) {
			throw new Error('Project name cannot exceed 100 characters');
		}

		// Validate system prompt
		if (args.systemPrompt.length > 10000) {
			throw new Error('System prompt cannot exceed 10,000 characters');
		}

		const projectId = await ctx.db.insert('projects', {
			userId: user._id,
			name: args.name.trim(),
			systemPrompt: args.systemPrompt,
			attachmentIds: [],
		});

		return projectId;
	},
});

/**
 * Update a project's name and/or system prompt
 * Only the project owner can update their project
 */
export const updateProject = mutation({
	args: {
		projectId: v.id('projects'),
		name: v.optional(v.string()),
		systemPrompt: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		// Verify project exists and user owns it
		const project = await ctx.db.get(args.projectId);
		if (!project) throw new Error('Project not found');

		if (project.userId !== user._id) {
			throw new Error('Unauthorized: You can only update your own projects');
		}

		// Prepare update object
		const updates: { name?: string; systemPrompt?: string } = {};

		if (args.name !== undefined) {
			if (!args.name.trim()) {
				throw new Error('Project name cannot be empty');
			}
			if (args.name.length > 100) {
				throw new Error('Project name cannot exceed 100 characters');
			}
			updates.name = args.name.trim();
		}

		if (args.systemPrompt !== undefined) {
			if (args.systemPrompt.length > 10000) {
				throw new Error('System prompt cannot exceed 10,000 characters');
			}
			updates.systemPrompt = args.systemPrompt;
		}

		await ctx.db.patch(args.projectId, updates);

		return { success: true };
	},
});

/**
 * Delete a project and cleanup all associated attachments
 * Only the project owner can delete their project
 */
export const deleteProject = mutation({
	args: { projectId: v.id('projects') },
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		// Verify project exists and user owns it
		const project = await ctx.db.get(args.projectId);
		if (!project) throw new Error('Project not found');

		if (project.userId !== user._id) {
			throw new Error('Unauthorized: You can only delete your own projects');
		}

		// Delete all project attachments from the attachments table
		for (const attachmentId of project.attachmentIds) {
			try {
				await ctx.db.delete(attachmentId);
			} catch (error) {
				console.error(`Failed to delete attachment ${attachmentId}:`, error);
				// Continue deleting other attachments even if one fails
			}
		}

		// Clear projectId from all threads that reference this project
		const projectThreads = await ctx.db
			.query('threads')
			.withIndex('by_project_id', (q) => q.eq('projectId', args.projectId))
			.collect();

		for (const thread of projectThreads) {
			await ctx.db.patch(thread._id, { projectId: undefined });
		}

		// Delete the project itself
		await ctx.db.delete(args.projectId);

		return { success: true };
	},
});

/**
 * Add an attachment to a project
 * Only the project owner can add attachments to their project
 */
export const addProjectAttachment = mutation({
	args: {
		projectId: v.id('projects'),
		attachmentId: v.id('attachments'),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		// Verify project exists and user owns it
		const project = await ctx.db.get(args.projectId);
		if (!project) throw new Error('Project not found');

		if (project.userId !== user._id) {
			throw new Error('Unauthorized: You can only modify your own projects');
		}

		// Verify attachment exists and user owns it
		const attachment = await ctx.db.get(args.attachmentId);
		if (!attachment) throw new Error('Attachment not found');

		if (attachment.userId !== user._id) {
			throw new Error('Unauthorized: You can only add your own attachments');
		}

		// Check if attachment is already in the project
		if (project.attachmentIds.includes(args.attachmentId)) {
			throw new Error('Attachment is already added to this project');
		}

		// Add attachment to project
		await ctx.db.patch(args.projectId, {
			attachmentIds: [...project.attachmentIds, args.attachmentId],
		});

		return { success: true };
	},
});

/**
 * Remove an attachment from a project and delete it from the attachments table
 * Only the project owner can remove attachments from their project
 */
export const removeProjectAttachment = mutation({
	args: {
		projectId: v.id('projects'),
		attachmentId: v.id('attachments'),
	},
	handler: async (ctx, args) => {
		const user = await getUser(ctx);
		if (!user) throw new Error('User not authenticated');

		// Verify project exists and user owns it
		const project = await ctx.db.get(args.projectId);
		if (!project) throw new Error('Project not found');

		if (project.userId !== user._id) {
			throw new Error('Unauthorized: You can only modify your own projects');
		}

		// Check if attachment is in the project
		if (!project.attachmentIds.includes(args.attachmentId)) {
			throw new Error('Attachment is not in this project');
		}

		// Remove attachment from project
		const updatedAttachmentIds = project.attachmentIds.filter(
			(id) => id !== args.attachmentId
		);

		await ctx.db.patch(args.projectId, {
			attachmentIds: updatedAttachmentIds,
		});

		// Delete the attachment from the attachments table
		try {
			await ctx.db.delete(args.attachmentId);
		} catch (error) {
			console.error(`Failed to delete attachment ${args.attachmentId}:`, error);
			// Continue execution even if attachment deletion fails
		}

		return { success: true };
	},
});
