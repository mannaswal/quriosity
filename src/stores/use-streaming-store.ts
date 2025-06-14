import { Id } from 'convex/_generated/dataModel';
import { create } from 'zustand';

type MessageId = Id<'messages'>;
type ThreadId = Id<'threads'>;

type StreamingMessage = {
	messageId: MessageId;
	content: string;
	reasoning: string;
	block: boolean;
	status?: 'done' | 'error' | 'streaming' | 'pending' | 'reasoning';
};

type StreamingStoreActions = {
	addStreamingMessage: (
		threadId: ThreadId,
		messageId: MessageId,
		content: string,
		reasoning?: string
	) => void;
	updateStreamingContent: (update: {
		threadId: ThreadId;
		messageId: MessageId;
		content: string;
		reasoning?: string;
		status?: 'done' | 'error' | 'streaming' | 'pending' | 'reasoning';
	}) => void;
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
					[threadId]: {
						messageId,
						content,
						reasoning: '',
						block: false,
						status: 'pending',
					},
				},
			}));
		},
		updateStreamingContent: (update) => {
			set((state) => {
				const existingMessage = state.messages[update.threadId];
				if (
					!existingMessage ||
					existingMessage.block ||
					existingMessage.messageId !== update.messageId
				)
					return state;

				return {
					messages: {
						...state.messages,
						[update.threadId]: {
							...existingMessage,
							...update,
						},
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
