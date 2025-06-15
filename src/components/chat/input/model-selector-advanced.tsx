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

/**
 * Advanced model selector with organized provider-based navigation
 * Supports nested menus for providers and reasoning levels
 */
export const ModelSelectorAdvanced = () => {
	const { model } = useModel();
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

	const handleModelChange = (selectedModel: ModelId) => {
		updateModel({ model: selectedModel });
	};

	const currentModelData = modelsData[model];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="justify-between font-normal has-[>svg]:px-2">
					<div
						className={cn(
							'flex items-center gap-2',
							!currentModelData && 'text-muted-foreground'
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
					</div>
					<ChevronDownIcon className="size-4 pointer-events-none opacity-50 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="top"
				align="start"
				className="w-40 rounded-lg border-[0.5px]">
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
										{providerModels.map((modelData) => (
											<DropdownMenuItem
												className="cursor-pointer"
												key={modelData.id}
												onClick={() => handleModelChange(modelData.id)}>
												<ModelSelectorItem modelData={modelData} />
											</DropdownMenuItem>
										))}
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
}: {
	modelData: ModelProperty;
}) => {
	return (
		<div className="flex items-center gap-4 w-full">
			{modelData.name}
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
				{modelData.attachments && (
					<FileText className="text-xs rounded size-3 shrink-0 opacity-75 text-gray-300" />
				)}
			</div>
		</div>
	);
};
