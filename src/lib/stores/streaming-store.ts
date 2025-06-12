import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';
import { Id } from '../../../convex/_generated/dataModel';

/**
 * Individual chunk data structure
 */
interface StreamChunk {
	id: string;
	content: string;
	timestamp: number;
	messageId: Id<'messages'>;
}

/**
 * Stream session data
 */
interface StreamSession {
	messageId: Id<'messages'>;
	threadId: Id<'threads'>;
	sessionId: string;
	status: 'streaming' | 'complete' | 'error' | 'stopped';
	chunks: StreamChunk[];
	accumulatedContent: string;
	startTime: number;
	endTime?: number;
	abortController?: AbortController;
}

export type StreamingActions = {
	startStream: (config: {
		messageId: Id<'messages'>;
		threadId: Id<'threads'>;
		sessionId: string;
		abortController?: AbortController;
	}) => void;

	addChunk: (messageId: Id<'messages'>, content: string) => void;

	completeStream: (
		messageId: Id<'messages'>,
		status: 'complete' | 'error' | 'stopped'
	) => void;

	abortStream: (messageId: Id<'messages'>) => void;

	getStreamContent: (messageId: Id<'messages'>) => string;

	getStreamStatus: (
		messageId: Id<'messages'>
	) => StreamSession['status'] | null;

	isThreadStreaming: (threadId: Id<'threads'>) => boolean;

	getActiveStreamForThread: (threadId: Id<'threads'>) => Id<'messages'> | null;

	clearSession: (messageId: Id<'messages'>) => void;

	// Cleanup old sessions (called periodically)
	cleanup: () => void;
};

/**
 * Streaming store state
 */
interface StreamingState {
	// Active streaming sessions by messageId
	sessions: Record<string, StreamSession>;

	// Current streaming message IDs by thread
	activeStreamsByThread: Record<string, Id<'messages'>>;

	// Actions
	actions: StreamingActions;
}

/**
 * Zustand store for managing streaming state
 * Handles chunk accumulation, session management, and multi-client coordination
 */
export const useStreamingStore = create<StreamingState>()(
	subscribeWithSelector((set, get) => ({
		sessions: {},
		activeStreamsByThread: {},

		actions: {
			startStream: (config) => {
				const { messageId, threadId, sessionId, abortController } = config;

				set((state) => ({
					sessions: {
						...state.sessions,
						[messageId]: {
							messageId,
							threadId,
							sessionId,
							status: 'streaming',
							chunks: [],
							accumulatedContent: '',
							startTime: Date.now(),
							abortController,
						},
					},
					activeStreamsByThread: {
						...state.activeStreamsByThread,
						[threadId]: messageId,
					},
				}));
			},

			addChunk: (messageId, content) => {
				set((state) => {
					const session = state.sessions[messageId];
					if (!session || session.status !== 'streaming') {
						return state;
					}

					const newChunk: StreamChunk = {
						id: `${messageId}-${Date.now()}-${Math.random()}`,
						content,
						timestamp: Date.now(),
						messageId,
					};

					const updatedSession = {
						...session,
						chunks: [...session.chunks, newChunk],
						accumulatedContent: session.accumulatedContent + content,
					};

					return {
						...state,
						sessions: {
							...state.sessions,
							[messageId]: updatedSession,
						},
					};
				});
			},

			completeStream: (messageId, status) => {
				set((state) => {
					const session = state.sessions[messageId];
					if (!session) {
						return state;
					}

					const updatedSession = {
						...session,
						status,
						endTime: Date.now(),
						abortController: undefined, // Clear abort controller
					};

					// Remove from active streams
					const newActiveStreams = { ...state.activeStreamsByThread };
					if (newActiveStreams[session.threadId] === messageId) {
						delete newActiveStreams[session.threadId];
					}

					return {
						...state,
						sessions: {
							...state.sessions,
							[messageId]: updatedSession,
						},
						activeStreamsByThread: newActiveStreams,
					};
				});
			},

			abortStream: (messageId) => {
				const session = get().sessions[messageId];
				if (session?.abortController) {
					session.abortController.abort();
				}

				get().actions.completeStream(messageId, 'stopped');
			},

			getStreamContent: (messageId) => {
				const session = get().sessions[messageId];
				return session?.accumulatedContent || '';
			},

			getStreamStatus: (messageId) => {
				const session = get().sessions[messageId];
				return session?.status || null;
			},

			isThreadStreaming: (threadId) => {
				return threadId in get().activeStreamsByThread;
			},

			getActiveStreamForThread: (threadId) => {
				return get().activeStreamsByThread[threadId] || null;
			},

			clearSession: (messageId) => {
				set((state) => {
					const session = state.sessions[messageId];
					if (!session) return state;

					// Remove from sessions
					const newSessions = { ...state.sessions };
					delete newSessions[messageId];

					// Remove from active streams if it's the active one
					const newActiveStreams = { ...state.activeStreamsByThread };
					if (newActiveStreams[session.threadId] === messageId) {
						delete newActiveStreams[session.threadId];
					}

					return {
						...state,
						sessions: newSessions,
						activeStreamsByThread: newActiveStreams,
					};
				});
			},

			cleanup: () => {
				const now = Date.now();
				const maxAge = 5 * 60 * 1000; // 5 minutes

				set((state) => {
					const newSessions: Record<string, StreamSession> = {};
					const newActiveStreams = { ...state.activeStreamsByThread };

					Object.entries(state.sessions).forEach(([messageId, session]) => {
						const age = now - session.startTime;
						const isComplete = session.status !== 'streaming';
						const shouldKeep = !isComplete || age < maxAge;

						if (shouldKeep) {
							newSessions[messageId] = session;
						} else {
							// Remove from active streams if being cleaned up
							if (newActiveStreams[session.threadId] === messageId) {
								delete newActiveStreams[session.threadId];
							}
						}
					});

					return {
						...state,
						sessions: newSessions,
						activeStreamsByThread: newActiveStreams,
					};
				});
			},
		},
	}))
);

/**
 * Hook to get streaming content for a specific message
 * Returns the accumulated content and streaming status
 */
export function useStreamingContent(messageId: Id<'messages'>) {
	const content = useStreamingStore((state) =>
		state.actions.getStreamContent(messageId)
	);
	const status = useStreamingStore((state) =>
		state.actions.getStreamStatus(messageId)
	);

	return useMemo(
		() => ({
			content,
			status,
			isStreaming: status === 'streaming',
		}),
		[content, status]
	);
}

/**
 * Hook to check if a thread is currently streaming
 */
export function useThreadStreamingStatus(threadId: Id<'threads'>) {
	const isStreaming = useStreamingStore((state) =>
		state.actions.isThreadStreaming(threadId)
	);
	const activeMessageId = useStreamingStore((state) =>
		state.actions.getActiveStreamForThread(threadId)
	);

	return useMemo(
		() => ({
			isStreaming,
			activeMessageId,
		}),
		[isStreaming, activeMessageId]
	);
}

/**
 * Hook to get streaming actions
 */
export function useStreamingActions() {
	return {
		startStream: useStreamingStore((state) => state.actions.startStream),
		addChunk: useStreamingStore((state) => state.actions.addChunk),
		completeStream: useStreamingStore((state) => state.actions.completeStream),
		abortStream: useStreamingStore((state) => state.actions.abortStream),
		clearSession: useStreamingStore((state) => state.actions.clearSession),
	};
}
