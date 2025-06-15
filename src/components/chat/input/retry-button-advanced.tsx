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
} from '@/lib/models';
import {
	useModel,
	useReasoningEffort,
	useUpdateModel,
} from '@/hooks/use-model';
import { ReasoningEffort } from '@/lib/types';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ModelSelectorItem } from './model-selector-advanced';

interface RetryButtonAdvancedProps {
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
}: RetryButtonAdvancedProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const getReasoningEffort = useReasoningEffort();
	const updateModel = useUpdateModel();

	// Group models by provider
	const modelsByProvider = useMemo(() => {
		const grouped: Record<ModelProvider, typeof models> = {} as Record<
			ModelProvider,
			typeof models
		>;

		models.forEach((modelData) => {
			if (!grouped[modelData.provider]) {
				grouped[modelData.provider] = [];
			}
			grouped[modelData.provider].push(modelData);
		});

		Object.values(grouped).forEach((models) => {
			models.sort((a, b) => b.name.localeCompare(a.name));
		});

		return grouped;
	}, []);

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

	return (
		<DropdownMenu
			open={isOpen}
			onOpenChange={handleOpenChange}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="size-8 dark:aria-expanded:bg-accent/50">
					<RefreshCcwIcon className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="bottom"
				className="w-40 rounded-lg border-[0.5px]">
				<DropdownMenuGroup>
					{/* Retry Same - doesn't change model */}
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => handleRegenerate()}>
						<div className="flex items-center gap-2">
							<RefreshCcwIcon className="size-4 opacity-60" />
							Retry Same
						</div>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					{/* Provider-based model selection */}
					{Object.entries(modelsByProvider).map(
						([provider, providerModels]) => (
							<DropdownMenuSub key={provider}>
								<DropdownMenuSubTrigger iconClassName="text-muted-foreground opacity-50 -mr-1.5">
									<div className="flex items-center gap-2.5">
										<div className="size-4">
											<Image
												className="dark:invert opacity-60"
												src={`/providers/${providerModelNames[
													provider as ModelProvider
												].toLowerCase()}.svg`}
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
										{providerModels.map((modelData) => {
											const hasReasoning = modelData.effortControl;

											if (hasReasoning) {
												// Model with reasoning - show submenu for reasoning levels
												return (
													<DropdownMenuSub key={modelData.id}>
														<DropdownMenuSubTrigger
															className="cursor-pointer"
															iconClassName="hidden"
															onClick={() =>
																handleModelChangeAndRetry(modelData.id)
															}>
															<ModelSelectorItem modelData={modelData} />
														</DropdownMenuSubTrigger>
														<DropdownMenuSubContent
															className="rounded-lg border-[0.5px]"
															alignOffset={-4}
															sideOffset={8}>
															{/* Reasoning level options */}
															{getReasoningOptionsForModel(modelData.id).map(
																(option) => (
																	<DropdownMenuItem
																		className="cursor-pointer"
																		key={option.value}
																		onClick={() =>
																			handleModelChangeAndRetry(
																				modelData.id,
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
														className="cursor-pointer"
														key={modelData.id}
														onClick={() =>
															handleModelChangeAndRetry(modelData.id)
														}>
														<div className="flex items-center gap-2 w-full">
															{modelData.name}
															<div className="flex items-center gap-2 ml-auto">
																{modelData.reasoning && (
																	<BrainIcon className="text-xs rounded size-3 shrink-0 opacity-75" />
																)}
																{modelData.vision && (
																	<EyeIcon className="text-xs rounded size-3 shrink-0 opacity-75" />
																)}
																{modelData.webSearch && (
																	<GlobeIcon className="text-xs rounded size-3 shrink-0 opacity-75" />
																)}
																{modelData.attachments && (
																	<PaperclipIcon className="text-xs rounded size-3 shrink-0 opacity-75" />
																)}
															</div>
														</div>
													</DropdownMenuItem>
												);
											}
										})}
									</DropdownMenuGroup>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						)
					)}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
