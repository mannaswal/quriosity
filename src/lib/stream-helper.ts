import { inferProcedureOutput } from '@trpc/server';
import { AppRouter } from '@/lib/trpc/root';

// Infer the output type from the tRPC router
export type GetStreamConfigResult = inferProcedureOutput<
	AppRouter['streaming']['getStreamConfig']
>;

/**
 * Simple stream handler that just initiates the stream.
 * Convex handles all database updates automatically on the backend.
 */
export async function handleStreamResponse({
	streamConfig,
}: {
	streamConfig: GetStreamConfigResult;
}) {
	const response = await fetch(streamConfig.streamUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${streamConfig.token}`,
		},
		body: JSON.stringify(streamConfig.payload),
	});

	if (!response.ok) {
		throw new Error(`Stream request failed: ${response.status}`);
	}

	// Just consume the stream to keep the connection alive
	// The backend handles all database updates automatically
	if (response.body) {
		const reader = response.body.getReader();
		try {
			while (true) {
				const { done } = await reader.read();
				if (done) break;
			}
		} finally {
			reader.releaseLock();
		}
	}
}
