import { createTRPCRouter } from './server';
import { streamingRouter } from './routers/streaming';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	streaming: streamingRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
