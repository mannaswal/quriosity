'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './root';

/**
 * A set of type-safe React hooks for your tRPC API.
 */
export const trpc = createTRPCReact<AppRouter>();
