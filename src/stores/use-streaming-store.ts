import { Id } from 'convex/_generated/dataModel';
import { create } from 'zustand';

type MessageId = Id<'messages'>;
type MessageBody = { content: string };

type StreamingStoreActions = {
	addMessage: (id: MessageId, message: MessageBody) => void;
	updateMessageBody: (id: MessageId, message: MessageBody) => void;
	removeMessage: (id: MessageId) => void;
	getMessage: (id: MessageId | undefined) => MessageBody | undefined;
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
		updateMessageBody: (id, message) => {
			set((state) => {
				if (!state.messages[id]) return state;

				return {
					messages: { ...state.messages, [id]: message },
				};
			});
		},
		removeMessage: (id) => {
			set((state) => ({ messages: { ...state.messages, [id]: undefined } }));
		},
		getMessage: (id) => {
			return id ? get().messages[id] : undefined;
		},
	},
}));

export const useStreamingStoreActions = () =>
	useStreamingStore((state) => state.actions);

export const useStreamingMessages = () =>
	useStreamingStore((state) => state.messages);
