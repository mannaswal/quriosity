import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define which routes are protected
// All routes in the (auth) layout group should be protected
const isProtectedRoute = createRouteMatcher([
	'/', // Home page (inside auth layout)
	'/chat(.*)',
	'/projects(.*)',
	// Add other specific routes you want to protect here
]);

// Define which routes should be excluded from auth checks
const isAuthRoute = createRouteMatcher([
	'/auth', // Login page
	'/auth/complete', // Auth completion page
]);

export default clerkMiddleware(async (auth, req) => {
	// console.log('Middleware - Path:', req.nextUrl.pathname);

	// Skip auth checks for auth routes to avoid redirect loops
	if (isAuthRoute(req)) {
		// console.log('Middleware - Skipping auth check for auth route');
		return;
	}

	// Check if the current route is protected
	if (isProtectedRoute(req)) {
		try {
			// Try to get auth status
			const { userId, sessionId } = await auth();
			// console.log('Middleware - userId:', userId, 'sessionId:', sessionId);

			// If user is not authenticated, redirect to auth page
			if (!userId || !sessionId) {
				// console.log('Middleware - No valid auth, redirecting to auth');
				const authUrl = new URL('/auth', req.url);

				return NextResponse.redirect(authUrl);
			}

			// console.log('Middleware - User authenticated, allowing access');
		} catch (error) {
			// console.error('Middleware - Auth error:', error);
			// If auth fails, redirect to login
			const authUrl = new URL('/auth', req.url);
			return NextResponse.redirect(authUrl);
		}
	}
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
};
