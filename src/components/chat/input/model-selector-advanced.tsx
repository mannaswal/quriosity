import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
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
	FileText,
	FileTextIcon,
	GlobeIcon,
	PaperclipIcon,
} from 'lucide-react';

import {
	ModelId,
	models,
	modelsData,
	providerModelNames,
	ModelProvider,
	ModelProperty,
} from '@/lib/models';
import { useModel, useUpdateModel } from '@/hooks/use-model';
import { useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
	useModelFiltering,
	getRestrictionsMessage,
} from '@/hooks/use-model-filtering';
import { TempAttachment } from '@/lib/types';
import { useTempAttachments } from '@/stores/use-temp-data-store';

/**
 * Advanced model selector with organized provider-based navigation
 * Supports nested menus for providers and reasoning levels
 * @param attachments - Optional array of temp attachments to filter models by
 */
export const ModelSelectorAdvanced = () => {
	const { model } = useModel();
	const updateModel = useUpdateModel();
	const attachments = useTempAttachments();

	// Filter models based on attachments
	const { filteredModels, restrictions, incompatibleModels } =
		useModelFiltering(attachments);

	// Group all models by provider (both compatible and incompatible)
	const modelsByProvider = useMemo(() => {
		const allModels = [...filteredModels, ...incompatibleModels];
		const grouped: Record<ModelProvider, typeof allModels> = {} as Record<
			ModelProvider,
			typeof allModels
		>;

		allModels.forEach((modelData) => {
			if (!grouped[modelData.provider]) {
				grouped[modelData.provider] = [];
			}
			grouped[modelData.provider].push(modelData);
		});

		Object.values(grouped).forEach((models) => {
			models.sort((a, b) => b.name.localeCompare(a.name));
		});

		return grouped;
	}, [filteredModels, incompatibleModels]);

	const handleModelChange = (selectedModel: ModelId) => {
		updateModel({ model: selectedModel });
	};

	const currentModelData = modelsData[model];
	const isCurrentModelIncompatible = incompatibleModels.some(
		(m) => m.id === model
	);
	const restrictionsMessage = getRestrictionsMessage(restrictions);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="justify-between font-normal has-[>svg]:px-2">
					<div
						className={cn(
							'flex items-center gap-2',
							!currentModelData && 'text-muted-foreground',
							isCurrentModelIncompatible && 'text-red-400'
						)}>
						{currentModelData && (
							<div className="size-4">
								<Image
									className="dark:invert opacity-60"
									src={`/providers/${providerModelNames[
										currentModelData.provider
									].toLowerCase()}.svg`}
									alt={currentModelData.provider}
									width={16}
									height={16}
									priority
									unoptimized
								/>
							</div>
						)}
						{currentModelData ? currentModelData.name : 'Select model'}
						{isCurrentModelIncompatible && (
							<span className="text-xs text-red-400">⚠</span>
						)}
					</div>
					<ChevronDownIcon className="size-4 pointer-events-none opacity-50 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="top"
				align="start"
				className="w-40 rounded-lg border-[0.5px]">
				{restrictionsMessage && (
					<div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
						{restrictionsMessage}
					</div>
				)}
				<DropdownMenuGroup>
					{Object.entries(modelsByProvider).map(
						([provider, providerModels]) => (
							<DropdownMenuSub key={provider}>
								<DropdownMenuSubTrigger iconClassName="text-muted-foreground opacity-50 -mr-1">
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
											const isIncompatible = incompatibleModels.some(
												(m) => m.id === modelData.id
											);
											return (
												<DropdownMenuItem
													className={cn(
														'cursor-pointer',
														isIncompatible && 'opacity-50 cursor-not-allowed'
													)}
													key={modelData.id}
													disabled={isIncompatible}
													onClick={() => {
														if (!isIncompatible) {
															handleModelChange(modelData.id);
														}
													}}>
													<ModelSelectorItem
														modelData={modelData}
														isIncompatible={isIncompatible}
													/>
												</DropdownMenuItem>
											);
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

export const ModelSelectorItem = ({
	modelData,
	isIncompatible = false,
}: {
	modelData: ModelProperty;
	isIncompatible?: boolean;
}) => {
	return (
		<div
			className={cn(
				'flex items-center gap-4 w-full',
				isIncompatible && 'opacity-50'
			)}>
			{modelData.name}
			{isIncompatible && <span className="text-xs text-red-400">⚠</span>}
			<div className="flex items-center gap-2 ml-auto">
				{modelData.reasoning && (
					<BrainIcon className="text-xs rounded size-3 shrink-0 opacity-75 text-purple-400" />
				)}
				{modelData.vision && (
					<EyeIcon className="text-xs rounded size-3 shrink-0 opacity-75 text-teal-300" />
				)}
				{modelData.webSearch && (
					<GlobeIcon className="text-xs rounded size-3 shrink-0 opacity-75 text-blue-400" />
				)}
				{modelData.docs && (
					<FileTextIcon className="text-xs rounded size-3 shrink-0 opacity-75 text-gray-300" />
				)}
			</div>
		</div>
	);
};
