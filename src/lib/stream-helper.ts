import { inferProcedureOutput } from '@trpc/server';
import { AppRouter } from '@/lib/trpc/root';
import { QueryClient } from '@tanstack/react-query';
import { messageKeys } from '@/hooks/use-messages';
import { Id } from '../../convex/_generated/dataModel';

// Infer the output type from the tRPC router
export type GetStreamConfigResult = inferProcedureOutput<
	AppRouter['streaming']['getStreamConfig']
>;

interface StreamResponseParams {
	streamConfig: GetStreamConfigResult;
	queryClient: QueryClient;
}

export async function handleStreamResponse({
	streamConfig,
	queryClient,
}: StreamResponseParams) {
	const response = await fetch(streamConfig.streamUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${streamConfig.token}`,
		},
		body: JSON.stringify(streamConfig.payload),
	});

	if (!response.body) {
		throw new Error('Response body is null');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let accumulatedResponse = '';

	const targetThreadId = streamConfig.payload.threadId as Id<'threads'>;
	const assistantMessageId = streamConfig.payload
		.assistantMessageId as Id<'messages'>;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		accumulatedResponse += decoder.decode(value);

		// Update React Query cache with streaming content
		queryClient.setQueryData(
			messageKeys.list(targetThreadId),
			(old: any[] | undefined) => {
				if (!old) return [];
				return old.map((msg) =>
					msg._id === assistantMessageId
						? { ...msg, content: accumulatedResponse }
						: msg
				);
			}
		);
	}
}
