import { Id } from 'convex/_generated/dataModel';
import { create } from 'zustand';

type MessageId = Id<'messages'>;
type MessageBody = { content: string };

type StreamingStoreActions = {
	addMessage: (id: MessageId, message: MessageBody) => void;
	updateMessage: (id: MessageId, message: MessageBody) => void;
	removeMessage: (id: MessageId) => void;
	getMessage: (id: MessageId) => MessageBody | undefined;
};

type StreamingStore = {
	messages: Record<MessageId, MessageBody>;
	actions: StreamingStoreActions;
};

const useStreamingStore = create<StreamingStore>((set, get) => ({
	messages: {},
	actions: {
		addMessage: (id, message) => {
			set((state) => ({ messages: { ...state.messages, [id]: message } }));
		},
		updateMessage: (id, message) => {
			set((state) => ({ messages: { ...state.messages, [id]: message } }));
		},
		removeMessage: (id) => {
			set((state) => ({ messages: { ...state.messages, [id]: undefined } }));
		},
		getMessage: (id) => {
			return get().messages[id];
		},
	},
}));

export const useStreamingStoreActions = () =>
	useStreamingStore((state) => state.actions);
