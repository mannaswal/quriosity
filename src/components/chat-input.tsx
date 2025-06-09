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
import { useThread } from '@/hooks/use-threads';

export function ChatInput({ threadId }: { threadId?: Id<'threads'> }) {
	const [message, setMessage] = useState('');
	const router = useRouter();
	const queryClient = useQueryClient();

	// Data hooks
	const thread = useThread(threadId);
	const [model, setModel] = useState<ModelId>('google/gemini-2.0-flash-001');

	// Mutation hooks
	const prepareForStreamMutation = usePrepareForStream();
	const createThreadAndPrepareForStreamMutation =
		useCreateThreadAndPrepareForStream();
	const updateThreadModelMutation = useUpdateThreadModel();
	const getStreamConfig = trpc.streaming.getStreamConfig.useMutation();

	// Set initial model from thread data
	useEffect(() => {
		if (thread?.currentModel) {
			setModel(thread.currentModel as ModelId);
		} else {
			// Default for new chats
			setModel('google/gemini-2.0-flash-001');
		}
	}, [thread?.currentModel]);

	const handleModelChange = useCallback(
		async (newModel: ModelId) => {
			setModel(newModel);
			if (threadId) {
				updateThreadModelMutation.mutate({
					threadId,
					model: newModel,
				});
			}
		},
		[threadId, updateThreadModelMutation]
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
						model: model,
					});
				} else {
					const result =
						await createThreadAndPrepareForStreamMutation.mutateAsync({
							messageContent: messageToSend,
							model: model,
						});
					assistantMessageId = result.assistantMessageId;
					targetThreadId = result.threadId;
					router.push(`/chat/${targetThreadId}`);
				}

				const streamConfig = await getStreamConfig.mutateAsync({
					threadId: targetThreadId,
					assistantMessageId,
					model,
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
		if (!message.trim()) return;
		handleSendMessage(message);
		setMessage('');
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
