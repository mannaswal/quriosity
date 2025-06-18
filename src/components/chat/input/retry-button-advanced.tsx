import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
	BrainIcon,
	ChevronDownIcon,
	EyeIcon,
	GlobeIcon,
	PaperclipIcon,
	RefreshCcwIcon,
} from 'lucide-react';

import {
	ModelId,
	models,
	modelsData,
	providerModelNames,
	ModelProvider,
	ModelProperty,
} from '@/lib/models';
import {
	useModel,
	useReasoningEffort,
	useUpdateModel,
	useModelsByProvider,
} from '@/hooks/use-model';
import { ReasoningEffort, AttachmentType, Message } from '@/lib/types';
import { createElement, useMemo, useState } from 'react';
import Image from 'next/image';
import { ModelSelectorItem } from './model-selector-advanced';
import {
	useModelFiltering,
	getRestrictionsMessage,
	useModelsCompatibility,
} from '@/hooks/use-model-filtering';
import { cn, getRestrictions } from '@/lib/utils';
import { usePreviousMessage } from '@/hooks/use-messages';
import { useAttachments, useMessageAttachments } from '@/hooks/use-attachments';
import { modelProviderLogos } from '@/lib/provider-logos';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';

interface RetryButtonAdvancedProps {
	message: Message;
	handleRegenerate: (
		model?: ModelId,
		reasoningEffort?: ReasoningEffort
	) => Promise<void>;
	onOpenChange?: (open: boolean) => void;
}

const reasoningOptions: { label: string; value: ReasoningEffort }[] = [
	{ label: 'High', value: 'high' },
	{ label: 'Medium', value: 'medium' },
	{ label: 'Low', value: 'low' },
];

/**
 * Advanced retry button with model selection and reasoning level options
 * Allows switching models and immediately retrying with the new model
 */
export const RetryButtonAdvanced = ({
	handleRegenerate,
	onOpenChange,
	message,
}: RetryButtonAdvancedProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const getReasoningEffort = useReasoningEffort();
	const updateModel = useUpdateModel();

	const previousMessage = usePreviousMessage(message._id);

	let retryMessage = message;

	const isAssistant = message.role === 'assistant';
	if (isAssistant && previousMessage) retryMessage = previousMessage;

	const messageAttachments = useMessageAttachments(retryMessage);
	const modelsByProvider = useModelsByProvider();
	const modelsCompatibility = useModelsCompatibility(messageAttachments);

	const restrictions = getRestrictions(messageAttachments);

	const handleModelChangeAndRetry = async (
		selectedModel: ModelId,
		reasoningLevel?: ReasoningEffort
	) => {
		setIsOpen(false);
		onOpenChange?.(false);
		try {
			// Update the model and reasoning level
			updateModel({ model: selectedModel, reasoningEffort: reasoningLevel });
			// Directly regenerate with the new model and reasoning level
			await handleRegenerate(
				selectedModel,
				getReasoningEffort(selectedModel, reasoningLevel)
			);
		} catch (error) {
			console.error('Failed to change model and retry:', error);
		}
	};

	const getReasoningOptionsForModel = (modelId: ModelId) => {
		if (modelId === 'x-ai/grok-3-mini-beta') {
			return reasoningOptions.filter((option) => option.value !== 'medium');
		}
		return reasoningOptions;
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		onOpenChange?.(open);
	};

	const currentModelId = message.model as ModelId;
	const currentModelData = modelsData[currentModelId];
	const currentReasoningEffort = message.reasoningEffort;

	return (
		<DropdownMenu
			open={isOpen}
			onOpenChange={handleOpenChange}>
			<DropdownMenuTrigger asChild>
				<Button
					onContextMenu={(e) => {
						handleRegenerate();
						e.preventDefault();
						e.stopPropagation();
					}}
					onClick={() => handleOpenChange(true)}
					variant="ghost"
					size="icon"
					className="size-8 dark:aria-expanded:bg-accent/50">
					<RefreshCcwIcon className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align={isAssistant ? 'start' : 'end'}
				side="bottom"
				className="w-40 rounded-lg border-[0.5px]">
				{restrictions.message && (
					<>
						<div className="px-2 py-1 text-xs text-muted-foreground">
							{restrictions.message}
						</div>
						<DropdownMenuSeparator className="h-[0.5px]" />
					</>
				)}
				<DropdownMenuGroup>
					<TooltipWrapper
						side={isAssistant ? 'left' : 'right'}
						sideOffset={8}
						tooltip={
							<div className="text-xs flex items-center gap-1">
								Tip: right-click{' '}
								<RefreshCcwIcon className="size-3 opacity-60" />
							</div>
						}>
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => handleRegenerate()}>
							<div className="flex items-center gap-2">
								<RefreshCcwIcon className="size-4 opacity-60" />
								Retry Same
							</div>
						</DropdownMenuItem>
					</TooltipWrapper>

					<DropdownMenuSeparator className="h-[0.5px]" />

					{/* Provider-based model selection */}
					{Object.entries(modelsByProvider).map(
						([provider, providerModels]) => {
							const modelProviderLogo =
								modelProviderLogos[provider as ModelProvider];
							const selected = provider === currentModelData?.provider;
							return (
								<DropdownMenuSub key={provider}>
									<DropdownMenuSubTrigger
										className={cn('group', selected && 'bg-muted')}
										iconClassName="text-muted-foreground -mr-1.5">
										<div className="flex items-center gap-2.5">
											<div className="size-4 relative shrink-0">
												<Image
													src={modelProviderLogo.monochrome.src}
													className={cn(
														modelProviderLogo.monochrome.className,
														!selected &&
															'absolute top-0 left-0 group-hover:opacity-0 	',
														selected && 'hidden'
													)}
													alt={provider}
													width={16}
													height={16}
													unoptimized
													priority
												/>
												<Image
													src={modelProviderLogo.colored.src}
													className={cn(
														modelProviderLogo.colored.className,
														!selected &&
															'absolute top-0 left-0 group-hover:opacity-100 opacity-0 	'
													)}
													alt={provider}
													width={16}
													height={16}
													unoptimized
													priority
												/>
											</div>
											{providerModelNames[provider as ModelProvider]}
										</div>
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent
										className="min-w-52 rounded-lg border-[0.5px]"
										alignOffset={-4}
										sideOffset={8}>
										<DropdownMenuGroup>
											{providerModels.map((modelId) => {
												const hasEffortControl =
													modelsData[modelId].effortControl;
												const isIncompatible =
													!modelsCompatibility[modelId].isCompatible;

												if (hasEffortControl) {
													// Model with reasoning - show submenu for reasoning levels
													return (
														<DropdownMenuSub key={modelId}>
															<DropdownMenuSubTrigger
																className={cn(
																	'cursor-pointer',
																	modelId === currentModelId && 'bg-muted',
																	isIncompatible &&
																		'opacity-50 cursor-not-allowed'
																)}
																iconClassName="hidden"
																disabled={isIncompatible}
																onClick={() => {
																	if (!isIncompatible) {
																		handleModelChangeAndRetry(modelId);
																	}
																}}>
																<ModelSelectorItem
																	modelId={modelId}
																	isIncompatible={isIncompatible}
																	restrictions={restrictions}
																/>
															</DropdownMenuSubTrigger>
															<DropdownMenuSubContent
																className="rounded-lg border-[0.5px]"
																alignOffset={-4}
																sideOffset={8}>
																{/* Reasoning level options */}
																{!isIncompatible &&
																	getReasoningOptionsForModel(modelId).map(
																		(option) => (
																			<DropdownMenuItem
																				className={cn(
																					'cursor-pointer',
																					option.value ===
																						currentReasoningEffort && 'bg-muted'
																				)}
																				key={option.value}
																				onClick={() =>
																					handleModelChangeAndRetry(
																						modelId,
																						option.value
																					)
																				}>
																				{option.label}
																			</DropdownMenuItem>
																		)
																	)}
															</DropdownMenuSubContent>
														</DropdownMenuSub>
													);
												} else {
													// Model without reasoning - direct click
													return (
														<DropdownMenuItem
															className={cn(
																'cursor-pointer',
																isIncompatible &&
																	'opacity-50 cursor-not-allowed'
															)}
															key={modelId}
															disabled={isIncompatible}
															onClick={() => {
																if (!isIncompatible) {
																	handleModelChangeAndRetry(modelId);
																}
															}}>
															<ModelSelectorItem
																modelId={modelId}
																isIncompatible={isIncompatible}
																restrictions={restrictions}
															/>
														</DropdownMenuItem>
													);
												}
											})}
										</DropdownMenuGroup>
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							);
						}
					)}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
