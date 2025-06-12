import { TRPCError, initTRPC } from '@trpc/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Creates the tRPC context for server-side operations.
 * This includes authentication information from Clerk.
 */
export async function createTRPCContext() {
	const { getToken, userId } = await auth();

	return {
		auth: {
			userId,
			getToken,
		},
	};
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Initialize tRPC with the context
 */
const t = initTRPC.context<Context>().create();

/**
 * Base router and procedure builders
 */
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure that requires authentication
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.auth.userId) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}

	return next({
		ctx: {
			...ctx,
			auth: {
				...ctx.auth,
				userId: ctx.auth.userId,
			},
		},
	});
});
