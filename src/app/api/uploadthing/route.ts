import { createRouteHandler } from 'uploadthing/next';
import { UTApi } from 'uploadthing/server';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { ourFileRouter } from './core';

export const { GET, POST } = createRouteHandler({
	router: ourFileRouter,
});

const utapi = new UTApi();

/**
 * Server mutation to delete an attachment from UploadThing
 */
export async function DELETE(req: NextRequest) {
	const user = await auth();
	if (!user.userId) return new NextResponse('Unauthorized', { status: 401 });

	const body = await req.json();

	if (!body.uploadThingKey)
		return new NextResponse('Missing uploadThingKey', { status: 400 });

	try {
		await utapi.deleteFiles(body.uploadThingKey);
		return new NextResponse('File deleted successfully', { status: 200 });
	} catch (error) {
		console.error('Error deleting file:', error);
		return new NextResponse('Error deleting file', { status: 500 });
	}
}
