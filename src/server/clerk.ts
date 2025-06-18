import { auth } from '@clerk/nextjs/server';

export async function getAuthToken() {
	try {
		const authResult = await auth();
		const token = await authResult.getToken({ template: 'convex' });
		return token ?? undefined;
	} catch (e) {
		console.error('Failed to get auth token:', e);
		return undefined;
	}
}
