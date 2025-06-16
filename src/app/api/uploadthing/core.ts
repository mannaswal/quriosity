import { auth } from '@clerk/nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from 'convex/_generated/api';
import { AttachmentType } from '@/lib/types';

const f = createUploadthing();

/**
 * Helper function to determine attachment type from mime type
 */
function getAttachmentType(mimeType: string): AttachmentType {
	if (mimeType === 'application/pdf') return 'pdf';
	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('text/')) return 'text';

	// Fallback based on common patterns
	if (mimeType.includes('pdf')) return 'pdf';
	throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Shared middleware for all upload endpoints
 */
const sharedMiddleware = async ({ req }: { req: Request }) => {
	const user = await auth();
	if (!user.userId) throw new UploadThingError('Unauthorized');

	const token = await user.getToken({ template: 'convex' });
	if (!token) throw new UploadThingError('No Convex token available');

	return { userId: user.userId, convexToken: token };
};

/**
 * Shared upload completion handler
 */
const sharedOnUploadComplete = async ({
	metadata,
	file,
}: {
	metadata: { userId: string; convexToken: string };
	file: { url: string; name: string; type: string };
}) => {
	try {
		const convexClient = new ConvexHttpClient(
			process.env.NEXT_PUBLIC_CONVEX_URL!
		);
		convexClient.setAuth(metadata.convexToken);

		const attachmentType = getAttachmentType(file.type);

		const attachmentId = await convexClient.mutation(
			api.attachments.insertAttachment,
			{
				filename: file.name,
				originalFilename: file.name,
				url: file.url,
				mimeType: file.type,
				type: attachmentType,
			}
		);

		console.log('Attachment stored:', attachmentId);

		return {
			attachmentId,
			type: attachmentType,
			uploadedBy: metadata.userId,
		};
	} catch (error) {
		console.error('Failed to store attachment:', error);
		throw new UploadThingError('Failed to store attachment in database');
	}
};

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
	/**
	 * Image uploader - for models with vision capability
	 * Supports: PNG, JPEG, GIF, WebP, HEIC
	 */
	imageUploader: f({
		image: {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
	})
		.middleware(sharedMiddleware)
		.onUploadComplete(sharedOnUploadComplete),

	/**
	 * Document uploader - for models with docs capability
	 * Supports: PDF files only
	 */
	docUploader: f({
		pdf: {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
	})
		.middleware(sharedMiddleware)
		.onUploadComplete(sharedOnUploadComplete),

	/**
	 * Text uploader - universal for any model with attachment support
	 * Supports: Plain text files
	 */
	textUploader: f({
		text: {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
	})
		.middleware(sharedMiddleware)
		.onUploadComplete(sharedOnUploadComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
