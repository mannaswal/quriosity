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
	EyeIcon,
	FileTextIcon,
	GlobeIcon,
	AlertTriangleIcon,
	EyeOffIcon,
} from 'lucide-react';
import FileTextOffIcon from 'public/icons/FileTextOffIcon.svg';

import {
	ModelId,
	modelsData,
	providerModelNames,
	ModelProvider,
} from '@/lib/models';
import { modelProviderLogos } from '@/lib/provider-logos';
import { useModelsByProvider, useUpdateModel } from '@/hooks/use-model';
import { cn, getRestrictions } from '@/lib/utils';
import { useModelsCompatibility } from '@/hooks/use-model-filtering';
import { useTempAttachments } from '@/stores/use-temp-data-store';
import { createElement } from 'react';
import Image from 'next/image';

/**
 * Advanced model selector with organized provider-based navigation
 * Supports nested menus for providers and reasoning levels
 * @param attachments - Optional array of temp attachments to filter models by
 */
export const ModelSelectorAdvanced = ({
	modelId: currentModelId,
}: {
	modelId: ModelId;
}) => {
	const updateModel = useUpdateModel();
	const attachments = useTempAttachments();

	// Group all models by provider (both compatible and incompatible)
	const modelsByProvider = useModelsByProvider();

	const currentModelData = modelsData[currentModelId];
	const modelsCompatibility = useModelsCompatibility(attachments);
	const restrictions = getRestrictions(attachments);

	const handleModelChange = (selectedModel: ModelId) => {
		updateModel({ model: selectedModel });
	};

	const isCurrentModelIncompatible =
		!modelsCompatibility[currentModelId].isCompatible;

	const currentModelProviderLogo =
		modelProviderLogos[currentModelData?.provider];

	return (
		<DropdownMenu>
			<Button
				variant="ghost"
				className="justify-between font-normal pl-2.5 pr-3"
				asChild>
				<DropdownMenuTrigger>
					<div
						className={cn(
							'flex items-center gap-2',
							!currentModelData && 'text-muted-foreground',
							!modelsCompatibility[currentModelId].isCompatible &&
								'text-red-400'
						)}>
						{currentModelData && (
							<div className="size-4">
								<Image
									src={currentModelProviderLogo.colored.src}
									className={currentModelProviderLogo.colored.className}
									alt={currentModelData.provider}
									width={16}
									height={16}
									unoptimized
								/>
							</div>
						)}
						{currentModelData ? currentModelData.name : 'Select model'}
						{isCurrentModelIncompatible && (
							<AlertTriangleIcon className="size-4 text-red-400" />
						)}
					</div>
				</DropdownMenuTrigger>
			</Button>

			<DropdownMenuContent
				side="top"
				align="start"
				className="w-40 rounded-lg border-[0.5px]">
				{restrictions.message && (
					<>
						<div className="px-2 py-1 text-xs text-muted-foreground ">
							{restrictions.message}
						</div>
						<DropdownMenuSeparator className="h-[0.5px]" />
					</>
				)}
				<DropdownMenuGroup>
					{Object.entries(modelsByProvider).map(
						([provider, providerModels]) => {
							const modelProviderLogo =
								modelProviderLogos[provider as ModelProvider];
							const selected = provider === currentModelData?.provider;
							return (
								<DropdownMenuSub key={provider}>
									<DropdownMenuSubTrigger
										className={cn('group', selected && 'bg-muted')}
										iconClassName="text-muted-foreground -mr-1">
										<div className="flex items-center gap-2.5">
											<div className="size-4 relative shrink-0">
												<Image
													src={modelProviderLogo.monochrome.src}
													className={cn(
														modelProviderLogo.monochrome.className,
														!selected &&
															'absolute top-0 left-0 group-hover:opacity-0',
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
															'absolute top-0 left-0 group-hover:opacity-100 opacity-0'
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
											{providerModels.map((modelId: ModelId) => {
												const isIncompatible =
													!modelsCompatibility[modelId].isCompatible;
												return (
													<DropdownMenuItem
														key={modelId}
														className={cn(
															'cursor-pointer',
															modelId === currentModelId && 'bg-muted',
															isIncompatible && 'opacity-50 cursor-not-allowed'
														)}
														disabled={isIncompatible}
														onClick={() => {
															if (!isIncompatible) {
																handleModelChange(modelId);
															}
														}}>
														<ModelSelectorItem
															modelId={modelId}
															isIncompatible={isIncompatible}
															restrictions={restrictions}
														/>
													</DropdownMenuItem>
												);
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

export const ModelSelectorItem = ({
	modelId,
	isIncompatible,
	restrictions,
}: {
	modelId: ModelId;
	isIncompatible: boolean;
	restrictions: {
		vision: boolean;
		docs: boolean;
	};
}) => {
	const modelData = modelsData[modelId];
	const visionIncompatible = restrictions.vision && isIncompatible;
	const docsIncompatible = restrictions.docs && isIncompatible;

	const iconClassName = cn(
		'size-3 shrink-0 opacity-75',
		isIncompatible && 'opacity-50'
	);
	return (
		<div className={cn('flex items-center gap-4 w-full')}>
			<div className={cn('text-sm', isIncompatible && 'opacity-50')}>
				{modelData.name}
			</div>
			<div className="flex items-center gap-2 ml-auto">
				{modelData.reasoning && (
					<BrainIcon className={cn('text-purple-400', iconClassName)} />
				)}
				{modelData.vision && (
					<EyeIcon className={cn('text-teal-300', iconClassName)} />
				)}
				{visionIncompatible && (
					<EyeOffIcon className={cn('text-red-400 size-3 shrink-0')} />
				)}
				{/* {modelData.webSearch && (
					<GlobeIcon className={cn('text-blue-400', iconClassName)} />
				)} */}
				{modelData.docs && (
					<FileTextIcon className={cn('text-gray-300', iconClassName)} />
				)}
				{docsIncompatible && (
					<FileTextOffIcon
						className={cn('text-red-400 size-3 shrink-0 stroke-red-400')}
					/>
				)}
			</div>
		</div>
	);
};
