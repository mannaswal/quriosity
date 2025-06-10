import { httpRouter } from 'convex/server';
import { streamChat } from './chat';
import { corsRouter } from 'convex-helpers/server/cors';

const http = httpRouter();

const cors = corsRouter(http, {
	allowedOrigins: ['*'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	allowCredentials: true,
	browserCacheMaxAge: 86400, // 24 hours
	exposedHeaders: ['Content-Type', 'Authorization'],
});

cors.route({
	path: '/stream',
	method: 'POST',
	handler: streamChat,
});

export default http;
