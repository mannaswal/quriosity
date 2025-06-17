import { auth } from '@clerk/nextjs/server';

export async function getAuthToken() {
	const authResult = await auth();
	const token = await authResult.getToken({ template: 'convex' });

	// // Debug the actual token content
	// if (token) {
	// 	try {
	// 		const payload = JSON.parse(atob(token.split('.')[1]));
	// 		console.log('🔍 Actual token payload:', JSON.stringify(payload, null, 2));
	// 	} catch (e) {
	// 		console.error('❌ Failed to decode token:', e);
	// 	}
	// }

	// console.log('Auth result:', { userId: authResult.userId, hasToken: !!token });
	return token ?? undefined;
}
