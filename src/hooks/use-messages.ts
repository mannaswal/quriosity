'use client';

import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import {
	Message,
	Project,
	ProjectWithAttachments,
	ReasoningEffort,
} from '@/lib/types';
import {
	useStreamingStoreActions,
	useStreamingMessage,
} from '@/stores/use-streaming-store';
import { useStopStream, useThread, useThreadId } from './use-threads';
import { useRouter } from 'next/navigation';
import { useModel, useReasoningEffort } from './use-model';
import { ModelId } from '@/lib/models';
import { processDataStream } from 'ai';
import { getMessagesByThread } from 'convex/messages';
import { useMemo, useCallback, useRef } from 'react';
import { TempAttachment } from '@/lib/types';
import {
	useAllAttachmentsUploaded,
	useTempAttachments,
	useTempSelectedProjectId,
} from '@/stores/use-temp-data-store';
import {
	useProject,
	useProjectData,
	useProjectDataByThreadId,
	useProjects,
} from './use-projects';

/**
 * Hook to get messages for a thread - now subscribes to both DB and streaming store
 */
export function useThreadMessages(threadIdParam?: Id<'threads'>): Message[] {
	const currentThreadId = useThreadId();

	const threadId = threadIdParam ?? currentThreadId;

	const { isAuthenticated } = useConvexAuth();

	// Subscribe to the streaming message for this thread
	const streamingMessage = useStreamingMessage(threadId);

	const dbMessages =
		useQuery(
			api.messages.getMessagesByThread,
			threadId && isAuthenticated ? { threadId } : 'skip'
		) ?? [];

	// Memoize the merged messages array to prevent infinite re-renders
	// This is crucial for XAI models that send rapid reasoning updates
	return useMemo(() => {
		// Early return if no messages
		if (dbMessages.length === 0) return dbMessages;

		const lastMessage = dbMessages[dbMessages.length - 1];

		// Early return if last message is already complete
		if (lastMessage.status === 'done' || lastMessage.status === 'error') {
			return dbMessages;
		}

		// Only check the last message since only the most recent assistant message can be streaming
		if (
			streamingMessage &&
			streamingMessage.messageId === lastMessage._id &&
			(lastMessage.status === 'pending' ||
				lastMessage.status === 'streaming' ||
				lastMessage.status === 'reasoning')
		) {
			// Create new array with updated last message
			const updatedMessages = [...dbMessages];
			updatedMessages[updatedMessages.length - 1] = {
				...lastMessage,
				content: streamingMessage.content,
				reasoning: streamingMessage.reasoning,
				status: streamingMessage.status ?? lastMessage.status,
			};
			return updatedMessages;
		}

		return dbMessages;
	}, [dbMessages, streamingMessage]);
}

/**
 * Reusable hook for streaming message content from the API
 * Handles status updates, streaming store management, and error cleanup
 */
function useStreamMessage() {
	const { updateStreamingContent, addStreamingMessage } =
		useStreamingStoreActions();
	const markMessageAsError = useMutation(api.messages.markMessageAsError);

	// Throttle updates to prevent React update depth exceeded errors
	// XAI models send reasoning chunks very rapidly
	const lastUpdateTime = useRef(0);
	const pendingUpdate = useRef<any>(null);
	const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

	const throttledUpdate = useCallback(
		(updateData: {
			threadId: Id<'threads'>;
			messageId: Id<'messages'>;
			content: string;
			reasoning: string;
			status: 'streaming' | 'reasoning' | 'done';
		}) => {
			const now = Date.now();

			// Store the latest update
			pendingUpdate.current = updateData;

			// Throttle frequent updates
			if (now - lastUpdateTime.current > 15) {
				lastUpdateTime.current = now;
				updateStreamingContent(updateData);

				// Clear any pending debounced update since we just sent one
				if (debounceTimeout.current) {
					clearTimeout(debounceTimeout.current);
					debounceTimeout.current = null;
				}
			} else {
				// Schedule a debounced update to ensure we don't miss the final chunk
				if (debounceTimeout.current) {
					clearTimeout(debounceTimeout.current);
				}
				debounceTimeout.current = setTimeout(() => {
					if (pendingUpdate.current) {
						updateStreamingContent(pendingUpdate.current);
						pendingUpdate.current = null;
					}
				}, 100);
			}
		},
		[updateStreamingContent]
	);

	return async (input: {
		threadId: Id<'threads'>;
		model: ModelId;
		reasoningEffort: ReasoningEffort | undefined;
		assistantMessageId: Id<'messages'>;
		messageHistory: Message[];
		projectData?: ProjectWithAttachments;
	}) => {
		const {
			threadId,
			model,
			reasoningEffort,
			assistantMessageId,
			messageHistory,
			projectData,
		} = input;
		addStreamingMessage(threadId, assistantMessageId, '', '');

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				body: JSON.stringify({
					threadId,
					messageId: assistantMessageId,
					model,
					reasoningEffort,
					messages: messageHistory,
					projectData,
				}),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to create message stream: ${response.status} ${response.statusText}`
				);
			}

			let content = '';
			let reasoning = '';
			await processDataStream({
				stream: response.body!,

				onTextPart: (text) => {
					content += text;
					throttledUpdate({
						threadId,
						messageId: assistantMessageId,
						content,
						reasoning,
						status: 'streaming',
					});
				},
				onReasoningPart: (text) => {
					reasoning += text;
					throttledUpdate({
						threadId,
						messageId: assistantMessageId,
						content,
						reasoning,
						status: 'reasoning',
					});
				},
				onFinishStepPart: (part) => {
					console.log(part);
					updateStreamingContent({
						threadId,
						messageId: assistantMessageId,
						content,
						reasoning,
						status: 'done',
					});
				},
			});
		} catch (error) {
			// Handle abort gracefully - don't treat as error
			if (error instanceof DOMException && error.name === 'AbortError') {
				return; // Don't update message status - client will handle
			}

			// Handle other errors - update message status to error
			try {
				await markMessageAsError({
					messageId: assistantMessageId,
				});
			} catch (updateError) {
				console.error('Failed to update message status on error:', updateError);
			}

			throw error;
		}
	};
}

/**
 * Hook to send a new message
 */
export function useSendMessage(opts?: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const router = useRouter();
	const thread = useThread();

	const { model, reasoningEffort } = useModel();
	const getReasoningEffort = useReasoningEffort();

	const tempAttachments = useTempAttachments();
	const allAttachmentsUploaded = useAllAttachmentsUploaded();

	const selectedProjectId = useTempSelectedProjectId();
	const projectData = useProjectData(selectedProjectId);

	const setupThread = useMutation(api.threads.setupThread);
	const createThread = useMutation(api.threads.createThread);
	const insertAttachments = useMutation(api.attachments.insertAttachments);

	const streamMessage = useStreamMessage();

	const sendMessage = async (messageContent: string) => {
		if (thread?.status === 'streaming') {
			toast.error("Can't send message while messages are streaming");
			return;
		}
		if (!allAttachmentsUploaded) {
			toast.error('Please wait for all attachments to finish uploading');
			return;
		}

		try {
			// Convert temp attachments to DB entries
			let attachmentIds: Id<'attachments'>[] = [];
			if (tempAttachments && tempAttachments.length > 0) {
				attachmentIds = await insertAttachments({
					attachments: tempAttachments
						.map((tempAtt) => {
							if (tempAtt.uploaded)
								return {
									type: tempAtt.type,
									filename: tempAtt.name,
									url: tempAtt.url,
									mimeType: tempAtt.mimeType,
									key: tempAtt.uploadThingKey,
								};
						})
						.filter((item) => item !== undefined),
				});
			}

			let targetThreadId = thread?._id;

			// If there is no thread, we create a new one
			if (!targetThreadId) {
				targetThreadId = await createThread({
					messageContent,
					model,
					reasoningEffort: getReasoningEffort(model, reasoningEffort),
					attachmentIds,
					projectId: selectedProjectId,
				});

				router.push(`/chat/${targetThreadId}`); // Redirect to the new thread
			}

			const { assistantMessageId, allMessages } = await setupThread({
				threadId: targetThreadId,
				model,
				reasoningEffort: getReasoningEffort(model, reasoningEffort),
				messageContent,
				attachmentIds,
			});

			// Start streaming
			await streamMessage({
				threadId: targetThreadId,
				model,
				reasoningEffort: getReasoningEffort(model, reasoningEffort),
				assistantMessageId,
				messageHistory: allMessages,
				projectData: projectData,
			});

			opts?.onSuccess?.();
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Send message was aborted');
				return;
			}
			toast.error('Failed to send message');
			opts?.onError?.(error as Error);
			throw error;
		}
	};

	return sendMessage;
}

/**
 * Hook to regenerate an assistant's response.
 */
export function useRegenerate(opts?: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const thread = useThread();
	const projectData = useProjectDataByThreadId(thread?._id);

	const {
		getStreamingMessage,
		removeStreamingMessage,
		updateStreamingContent,
		blockStreaming,
	} = useStreamingStoreActions();

	const streamMessage = useStreamMessage();
	const getReasoningEffort = useReasoningEffort();

	const regenerateMutation = useMutation(api.messages.regenerateResponse);

	return async (args: {
		messageId: Id<'messages'>;
		threadId: Id<'threads'>;
		model?: ModelId;
		reasoningEffort?: ReasoningEffort;
	}) => {
		try {
			if (getStreamingMessage(args.threadId)) {
				updateStreamingContent({
					threadId: args.threadId,
					messageId: args.messageId,
					content: '',
					reasoning: '',
				});
				blockStreaming(args.threadId);
			}

			const effort = getReasoningEffort(
				args.model as ModelId,
				args.reasoningEffort
			);

			const { assistantMessageId, assistantMessage, messages } =
				await regenerateMutation({
					messageId: args.messageId,
					updatedModel: args.model,
					updatedReasoningEffort: effort,
				});

			removeStreamingMessage(args.threadId);

			// Start streaming with project data
			await streamMessage({
				threadId: assistantMessage.threadId,
				model: assistantMessage.model as ModelId,
				reasoningEffort: effort,
				assistantMessageId,
				messageHistory: messages,
				projectData: projectData,
			});

			opts?.onSuccess?.();
			return { assistantMessageId, messages };
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Regenerate was aborted');
				return;
			}
			toast.error('Failed to regenerate response');
			opts?.onError?.(error as Error);
			throw error;
		}
	};
}

/**
 * Hook to edit and resubmit a user message with a new response.
 */
export function useEditAndResubmit(opts?: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	const thread = useThread();
	const projectData = useProjectDataByThreadId(thread?._id);

	const streamMessage = useStreamMessage();
	const editMutation = useMutation(api.messages.editAndResubmit);

	const {
		getStreamingMessage,
		removeStreamingMessage,
		updateStreamingContent,
		blockStreaming,
	} = useStreamingStoreActions();

	const getReasoningEffort = useReasoningEffort();

	return async (args: {
		userMessageId: Id<'messages'>;
		threadId: Id<'threads'>;
		newContent: string;
		model?: ModelId;
		reasoningEffort?: ReasoningEffort;
	}) => {
		try {
			const currentStreamingMessage = getStreamingMessage(args.threadId);
			if (currentStreamingMessage) {
				updateStreamingContent({
					threadId: args.threadId,
					messageId: currentStreamingMessage.messageId,
					content: '',
					reasoning: '',
				});
				blockStreaming(args.threadId);
			}

			const effort = getReasoningEffort(
				args.model as ModelId,
				args.reasoningEffort
			);

			const { assistantMessageId, assistantMessage, messages } =
				await editMutation({
					userMessageId: args.userMessageId,
					newContent: args.newContent,
					updatedModel: args.model,
					updatedReasoningEffort: effort,
				});

			removeStreamingMessage(args.threadId);

			// Start streaming
			await streamMessage({
				threadId: assistantMessage.threadId,
				model: assistantMessage.model as ModelId,
				reasoningEffort: effort,
				assistantMessageId,
				messageHistory: messages,
				projectData: projectData,
			});

			opts?.onSuccess?.();
			return { assistantMessageId, messages };
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Edit and resubmit was aborted');
				return;
			}
			toast.error('Failed to edit message');
			opts?.onError?.(error as Error);
			throw error;
		}
	};
}

/**
 * Hook to get the previous message in a thread
 */
export function usePreviousMessage(messageId: Id<'messages'>) {
	const messages = useThreadMessages();

	const previousMessage = useMemo(() => {
		const index = messages.findIndex((m) => m._id === messageId);
		if (index === -1 || index === 0) return null;

		return messages[index - 1];
	}, [messages, messageId]);

	return previousMessage;
}
