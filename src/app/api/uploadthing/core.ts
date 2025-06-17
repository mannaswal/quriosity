import { auth } from '@clerk/nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
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

	return { userId: user.userId };
};

/**
 * Shared upload completion handler - returns metadata instead of storing in DB
 */
const sharedOnUploadComplete = async ({
	metadata,
	file,
}: {
	metadata: { userId: string };
	file: {
		ufsUrl: string;
		name: string;
		type: string;
		key: string;
	};
}) => {
	try {
		const attachmentType = getAttachmentType(file.type);

		// console.log('File uploaded to UploadThing:', file.name);

		// Return metadata for temp store instead of storing in DB
		return {
			id: crypto.randomUUID(), // Generate temp ID
			name: file.name,
			url: file.ufsUrl,
			mimeType: file.type,
			type: attachmentType,
			uploadThingKey: file.key,
			uploadedBy: metadata.userId,
		};
	} catch (error) {
		console.error('Failed to process upload:', error);
		throw new UploadThingError('Failed to process upload');
	}
};

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
	/**
	 * Text only uploader - for models with no vision/docs capability
	 * Accepts: Text files only
	 */
	textOnlyUploader: f({
		text: {
			maxFileSize: '1MB',
			maxFileCount: 20,
		},
	})
		.middleware(sharedMiddleware)
		.onUploadComplete(sharedOnUploadComplete),

	/**
	 * Docs + Text uploader - for models with docs capability but no vision
	 * Accepts: Text files and PDFs
	 */
	docsTextUploader: f({
		text: {
			maxFileSize: '1MB',
			maxFileCount: 20,
		},
		pdf: {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
	})
		.middleware(sharedMiddleware)
		.onUploadComplete(sharedOnUploadComplete),

	/**
	 * Images + Text uploader - for models with vision capability but no docs
	 * Accepts: Text files and Images
	 */
	imagesTextUploader: f({
		text: {
			maxFileSize: '1MB',
			maxFileCount: 20,
		},
		'image/png': {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
		'image/jpeg': {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
		'image/gif': {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
		'image/webp': {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
	})
		.middleware(sharedMiddleware)
		.onUploadComplete(sharedOnUploadComplete),

	/**
	 * All files uploader - for models with both vision and docs capability
	 * Accepts: Text files, Images, and PDFs
	 */
	allFilesUploader: f({
		text: {
			maxFileSize: '1MB',
			maxFileCount: 20,
		},
		image: {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
		pdf: {
			maxFileSize: '16MB',
			maxFileCount: 20,
		},
	})
		.middleware(sharedMiddleware)
		.onUploadComplete(sharedOnUploadComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
