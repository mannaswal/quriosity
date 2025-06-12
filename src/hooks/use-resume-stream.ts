import { useCallback, useRef } from 'react';
import { Id } from '../../convex/_generated/dataModel';
import { useStreamingActions } from '@/lib/stores/streaming-store';
import { trpc } from '@/lib/trpc/client';

/**
 * Hook for resuming streams for late-joining clients
 * Handles catch-up by fetching accumulated chunks and then listening for live updates
 */
export function useResumeStream() {
	const { startStream, addChunk, completeStream } = useStreamingActions();
	const getResumeConfig = trpc.streaming.getResumeConfig.useMutation();
	const abortControllerRef = useRef<AbortController | null>(null);

	/**
	 * Resume a stream for a late-joining client
	 */
	const resumeStream = useCallback(
		async (
			messageId: Id<'messages'>,
			threadId: Id<'threads'>,
			sessionId?: string
		) => {
			try {
				// Abort any existing stream for this message
				if (abortControllerRef.current) {
					abortControllerRef.current.abort();
				}

				// Create new abort controller
				const abortController = new AbortController();
				abortControllerRef.current = abortController;

				// Get resume configuration from TRPC
				const resumeConfig = await getResumeConfig.mutateAsync({
					messageId,
					sessionId,
				});

				// Start the stream session in Zustand
				startStream({
					messageId,
					threadId,
					sessionId: sessionId || crypto.randomUUID(),
					abortController,
				});

				// Start the resume stream
				const response = await fetch(resumeConfig.resumeUrl, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${resumeConfig.token}`,
						Accept: 'text/plain',
					},
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(`Resume stream failed: ${response.statusText}`);
				}

				if (!response.body) {
					throw new Error('Response body is null');
				}

				// Process the stream
				const reader = response.body.getReader();
				const decoder = new TextDecoder();

				try {
					while (true) {
						const { done, value } = await reader.read();

						if (done) {
							// Stream completed normally
							completeStream(messageId, 'complete');
							break;
						}

						// Decode and add chunk
						const chunk = decoder.decode(value, { stream: true });
						if (chunk) {
							addChunk(messageId, chunk);
						}
					}
				} catch (error) {
					if (error instanceof DOMException && error.name === 'AbortError') {
						// Stream was aborted
						completeStream(messageId, 'stopped');
					} else {
						// Stream error
						console.error('Resume stream error:', error);
						completeStream(messageId, 'error');
					}
				} finally {
					reader.releaseLock();
				}
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') {
					// Request was aborted
					completeStream(messageId, 'stopped');
				} else {
					console.error('Failed to resume stream:', error);
					completeStream(messageId, 'error');
				}
			} finally {
				abortControllerRef.current = null;
			}
		},
		[startStream, addChunk, completeStream, getResumeConfig]
	);

	/**
	 * Abort the current resume stream
	 */
	const abortResumeStream = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	return {
		resumeStream,
		abortResumeStream,
		isLoading: getResumeConfig.isPending,
	};
}

/**
 * Hook for detecting if a message needs to be resumed
 * Checks if a message is in streaming state but not in local Zustand store
 */
export function useStreamDetection() {
	const { resumeStream } = useResumeStream();

	/**
	 * Check if a message needs to be resumed and start resume if needed
	 */
	const checkAndResumeIfNeeded = useCallback(
		(
			messageId: Id<'messages'>,
			threadId: Id<'threads'>,
			messageStatus: string,
			localStreamingStatus: string | null
		) => {
			// If message is in_progress in database but not streaming locally, resume it
			const needsResume =
				messageStatus === 'in_progress' && !localStreamingStatus;

			if (needsResume) {
				console.log(`Resuming stream for message ${messageId}`);
				resumeStream(messageId, threadId);
			}

			return needsResume;
		},
		[resumeStream]
	);

	return {
		checkAndResumeIfNeeded,
	};
}
