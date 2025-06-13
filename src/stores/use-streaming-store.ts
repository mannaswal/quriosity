import { Id } from 'convex/_generated/dataModel';
import { create } from 'zustand';

type MessageId = Id<'messages'>;
type ThreadId = Id<'threads'>;

type StreamingMessage = {
	messageId: MessageId;
	content: string;
	block: boolean;
};

type StreamingStoreActions = {
	addStreamingMessage: (
		threadId: ThreadId,
		messageId: MessageId,
		content: string
	) => void;
	updateStreamingContent: (threadId: ThreadId, content: string) => void;
	removeStreamingMessage: (threadId: ThreadId) => void;
	getStreamingMessage: (
		threadId: ThreadId | undefined
	) => StreamingMessage | undefined;
	blockStreaming: (threadId: ThreadId) => void;
};

type StreamingStore = {
	messages: Record<ThreadId, StreamingMessage>;
	actions: StreamingStoreActions;
};

const useStreamingStore = create<StreamingStore>((set, get) => ({
	messages: {},
	actions: {
		addStreamingMessage: (threadId, messageId, content) => {
			set((state) => ({
				messages: {
					...state.messages,
					[threadId]: { messageId, content },
				},
			}));
		},
		updateStreamingContent: (threadId, content) => {
			set((state) => {
				const existingMessage = state.messages[threadId];
				if (!existingMessage) return state;
				if (existingMessage.block) return state;
				return {
					messages: {
						...state.messages,
						[threadId]: { ...existingMessage, content },
					},
				};
			});
		},
		removeStreamingMessage: (threadId) => {
			set((state) => {
				const { [threadId]: _, ...rest } = state.messages;
				return { messages: rest };
			});
		},
		getStreamingMessage: (threadId) => {
			return threadId ? get().messages[threadId] : undefined;
		},
		blockStreaming: (threadId) => {
			set((state) => ({
				messages: {
					...state.messages,
					[threadId]: {
						...state.messages[threadId],
						block: true,
					},
				},
			}));
		},
	},
}));

export const useStreamingStoreActions = () =>
	useStreamingStore((state) => state.actions);

export const useStreamingMessage = (threadId: ThreadId | undefined) =>
	useStreamingStore((state) =>
		threadId ? state.messages[threadId] : undefined
	);
