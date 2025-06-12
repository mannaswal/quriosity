import { httpRouter } from 'convex/server';
import { corsRouter } from 'convex-helpers/server/cors';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';

const http = httpRouter();

const cors = corsRouter(http, {
	allowedOrigins: ['*'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Origin'],
	allowCredentials: true,
	browserCacheMaxAge: 86400, // 24 hours
	exposedHeaders: ['Content-Type', 'Authorization'],
});

/**
 * HTTP action to finalize a stream from Vercel Edge Functions
 * This allows Edge Functions to call Convex securely
 */
cors.route({
	path: '/finalize-stream',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		try {
			// Parse the request body
			const body = await request.json();
			const { messageId, content, status, stopReason } = body;

			// Validate required fields
			if (
				messageId === undefined ||
				content === undefined ||
				status === undefined ||
				stopReason === undefined
			) {
				return new Response('Missing required fields', { status: 400 });
			}

			// Get auth token from header
			const authHeader = request.headers.get('Authorization');
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				return new Response('Unauthorized', { status: 401 });
			}

			// Call the internal mutation to finalize the stream
			await ctx.runMutation(internal.messages.finalizeStream, {
				messageId: messageId as Id<'messages'>,
				content,
				status,
				stopReason:
					stopReason || (status === 'complete' ? 'completed' : 'error'),
			});

			return new Response(JSON.stringify({ message: 'OK' }), {
				status: 200,
			});
		} catch (error) {
			console.error('Error in finalize-stream:', error);
			return new Response('Internal server error', { status: 500 });
		}
	}),
});

// HTTP routes will be added here when needed
// The old /stream route has been removed in favor of Vercel Edge Functions

export default http;
