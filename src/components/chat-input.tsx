'use client';

import { SendIcon } from 'lucide-react';
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from './ui/prompt-input';
import { Button } from './ui/button';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select';
import { ModelId, models } from '@/lib/models';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import {
	usePrepareForStream,
	useCreateThreadAndPrepareForStream,
	useUpdateThreadModel,
	messageKeys,
} from '@/hooks/use-messages';
import { useThread, useThreads } from '@/hooks/use-threads';
import { useCurrentUser, useUpdateLastModelUsed } from '@/hooks/use-user';

export function ChatInput({ threadId }: { threadId?: Id<'threads'> }) {
	const [message, setMessage] = useState('');
	const router = useRouter();
	const queryClient = useQueryClient();

	// --- Pre-emptive state initialization from cached data ---
	const threads = useThreads();
	const currentUser = useCurrentUser();
	const getInitialModel = () => {
		if (threadId) {
			// Find the thread in the cached list from the sidebar
			const preloadedThread = threads?.find((t) => t._id === threadId);
			if (preloadedThread?.currentModel) {
				// If we have a model, use it for the initial state
				return preloadedThread.currentModel as ModelId;
			}
		} else if (currentUser?.lastModelUsed) {
			// For new chats, use the user's last used model
			return currentUser.lastModelUsed as ModelId;
		}

		// Fallback for new chats or if data isn't cached.
		// The useEffect below will set the appropriate default.
		return undefined;
	};

	// Data hooks
	const thread = useThread(threadId);
	const [model, setModel] = useState<ModelId | undefined>(getInitialModel);

	// Mutation hooks
	const prepareForStreamMutation = usePrepareForStream();
	const createThreadAndPrepareForStreamMutation =
		useCreateThreadAndPrepareForStream();
	const updateThreadModelMutation = useUpdateThreadModel();
	const { mutate: updateLastModelUsed } = useUpdateLastModelUsed();
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();

	// Effect to sync thread's model to local state
	useEffect(() => {
		if (thread) {
			// If thread data is available, it's the source of truth.
			// This updates the model when the thread loads or changes.
			setModel(thread.currentModel as ModelId);
		} else if (!threadId) {
			// This is a new chat session (no threadId).
			// Set the default based on the user's last preference or a system default.
			setModel(
				(currentUser?.lastModelUsed as ModelId) ?? 'google/gemini-2.0-flash-001'
			);
		}
		// When loading a thread (threadId exists but thread is not yet loaded),
		// we deliberately do nothing. This keeps the previous model visible
		// until the new one is loaded, preventing any flicker.
	}, [thread, threadId, currentUser]);

	const handleModelChange = useCallback(
		async (newModel: ModelId) => {
			// Update local state immediately for snappy UI
			setModel(newModel);
			// Update the preference in the database for the current user
			updateLastModelUsed({ model: newModel });

			// If there's a thread, persist the change to the thread as well
			if (threadId) {
				updateThreadModelMutation.mutate({
					threadId,
					model: newModel,
				});
			}
			// If no threadId, the new model is stored in local state
			// and will be used when handleSendMessage creates the new thread.
		},
		[threadId, updateThreadModelMutation, updateLastModelUsed]
	);

	const handleSendMessage = useCallback(
		async (messageToSend: string) => {
			if (!messageToSend.trim()) return;

			let targetThreadId: Id<'threads'> | undefined;

			try {
				let assistantMessageId: Id<'messages'>;

				if (threadId) {
					targetThreadId = threadId;
					assistantMessageId = await prepareForStreamMutation.mutateAsync({
						threadId: threadId,
						messageContent: messageToSend,
						model: model!, // Use model from state
					});
				} else {
					const result =
						await createThreadAndPrepareForStreamMutation.mutateAsync({
							messageContent: messageToSend,
							model: model!, // Use model from state
						});
					assistantMessageId = result.assistantMessageId;
					targetThreadId = result.threadId;
					router.push(`/chat/${targetThreadId}`);
				}

				const streamConfig = await getStreamConfig.mutateAsync({
					threadId: targetThreadId,
					assistantMessageId,
					model: model!, // Use model from state
				});

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

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					accumulatedResponse += decoder.decode(value);

					// Update cache with streaming content
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
			} catch (error) {
				console.error('Failed to send message or stream response:', error);
				toast.error('Failed to send message');
			} finally {
				// Invalidate to get final message from server
				if (targetThreadId) {
					queryClient.invalidateQueries({
						queryKey: messageKeys.list(targetThreadId),
					});
				}
			}
		},
		[
			threadId,
			model,
			prepareForStreamMutation,
			createThreadAndPrepareForStreamMutation,
			router,
			getStreamConfig,
			queryClient,
		]
	);

	const onSendMessage = () => {
		if (!message.trim() || !model) return;
		handleSendMessage(message);
		setMessage(''); // Clear input after sending
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			onSendMessage();
		}
	};

	return (
		<div className="w-full absolute bottom-2 left-1/2 -translate-x-1/2 max-w-3xl">
			<PromptInput>
				<PromptInputTextarea
					autoFocus
					value={message}
					spellCheck={false}
					data-ms-editor="false"
					placeholder="Type here..."
					className="md:text-base"
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
				<PromptInputActions className="w-full flex items-center justify-between pt-2">
					<PromptInputAction
						delayDuration={300}
						tooltip="Model">
						<Select
							value={model}
							onValueChange={(value) => handleModelChange(value as ModelId)}>
							<SelectTrigger className="border-none not-hover:dark:bg-transparent">
								<SelectValue placeholder="Select a model" />
							</SelectTrigger>
							<SelectContent>
								{models.map((m) => (
									<SelectItem
										key={m.id}
										value={m.id}>
										{m.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</PromptInputAction>
					<PromptInputAction
						delayDuration={300}
						tooltip="Send">
						<Button
							disabled={!model}
							onClick={onSendMessage}
							variant="ghost"
							size="icon"
							className="rounded-lg">
							<SendIcon className="size-4" />
						</Button>
					</PromptInputAction>
				</PromptInputActions>
			</PromptInput>
		</div>
	);
}
