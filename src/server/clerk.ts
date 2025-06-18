import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export async function getAuthToken() {
	try {
		const authResult = await auth();
		const token = await authResult.getToken({ template: 'convex' });
		return token ?? undefined;
	} catch (e) {
		console.error('Failed to get auth token:', e);
		redirect('/');
		return undefined;
	}
}
