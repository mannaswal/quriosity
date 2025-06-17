import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define which routes are protected
const isProtectedRoute = createRouteMatcher([
	'/chat(.*)',
	'/projects(.*)',
	'/api/chat(.*)',
	'/api/uploadthing(.*)',
	// Add other specific routes you want to protect here
]);

export default clerkMiddleware(async (auth, req) => {
	// Check if the current route is protected
	if (isProtectedRoute(req)) {
		// Get the user's authentication status
		const { userId } = await auth();

		// If user is not authenticated, redirect to home page
		if (!userId) {
			const homeUrl = new URL('/', req.url);
			return NextResponse.redirect(homeUrl);
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
