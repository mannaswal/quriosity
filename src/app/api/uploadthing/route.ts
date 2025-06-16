'use server';

import { createRouteHandler } from 'uploadthing/next';
import { UTApi } from 'uploadthing/server';
import { auth } from '@clerk/nextjs/server';

import { ourFileRouter } from './core';

export const { GET, POST } = createRouteHandler({
	router: ourFileRouter,
});

const utapi = new UTApi();

/**
 * Server mutation to delete an attachment from UploadThing
 */
export const deleteFromUploadThing = async (uploadThingKey: string) => {
	const user = await auth();
	if (!user.userId) throw new Error('Unauthorized');

	try {
		await utapi.deleteFiles(uploadThingKey);
	} catch (error) {
		console.error('Error deleting file:', error);
		throw error;
	}
};
