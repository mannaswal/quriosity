'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { trpc } from './client';
import { useAuth } from '@clerk/nextjs';
import { ConvexReactClient } from 'convex/react';

function getBaseUrl() {
	if (typeof window !== 'undefined') return '';
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCProvider(props: { children: React.ReactNode }) {
	const { getToken } = useAuth();

	const [queryClient] = useState(() => {
		// Create Convex client (reuse the same URL as the main app)
		const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
		const convexQueryClient = new ConvexQueryClient(convex);

		const qc = new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: 5 * 60 * 1000, // 5 minutes
					refetchOnWindowFocus: false,
					// Enable Convex integration
					queryKeyHashFn: convexQueryClient.hashFn(),
					queryFn: convexQueryClient.queryFn(),
				},
			},
		});

		// Connect Convex to React Query for real-time updates
		convexQueryClient.connect(qc);
		return qc;
	});

	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					url: `${getBaseUrl()}/api/trpc`,
					async headers() {
						const token = await getToken();
						return {
							Authorization: token ? `Bearer ${token}` : undefined,
						};
					},
				}),
			],
		})
	);

	return (
		<trpc.Provider
			client={trpcClient}
			queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				{props.children}
			</QueryClientProvider>
		</trpc.Provider>
	);
}
