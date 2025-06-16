import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useModel, useUpdateModel } from '@/hooks/use-model';
import { ReasoningEffort } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BrainIcon } from 'lucide-react';
import { useMemo } from 'react';

const reasoningOptions = [
	{ label: 'High', value: 'high' },
	{ label: 'Medium', value: 'medium' },
	{ label: 'Low', value: 'low' },
];

export const ReasoningSelector = () => {
	const { reasoningEffort, model } = useModel();
	const updateModel = useUpdateModel();

	const handleReasoningChange = (reasoningEffort: ReasoningEffort) => {
		updateModel({ reasoningEffort });
	};

	const options = useMemo(() => {
		if (model === 'x-ai/grok-3-mini-beta')
			return [reasoningOptions[0], reasoningOptions[2]];
		return reasoningOptions;
	}, [model]);

	const noMedium = options.length === 2;

	const currentOption = options.find(
		(option) => option.value === reasoningEffort
	);
	const currentValue = currentOption?.value;
	const currentLabel = currentOption?.label;

	const dotBaseClass =
		'rounded-full size-1 bg-accent-foreground/20 transition-all duration-100';

	return (
		<Select
			value={reasoningEffort ?? 'medium'}
			onValueChange={(value) =>
				handleReasoningChange(value as ReasoningEffort)
			}>
			<SelectTrigger
				hideChevron
				className="border-none not-hover:dark:bg-transparent cursor-pointer px-1">
				<Button
					variant="ghost"
					size="icon"
					className="flex items-center gap-0.5">
					<BrainIcon
						className="size-4 text-foreground"
						strokeWidth={1.2}
					/>
					<div className="flex flex-col gap-px -mb-[1px]">
						<div
							className={cn(
								dotBaseClass,
								'-ml-[0.5px]',
								noMedium && 'opacity-0',
								currentValue === 'high' &&
									'bg-accent-foreground/50 border-transparent'
							)}
						/>

						<div
							className={cn(
								dotBaseClass,
								'ml-px',
								(currentValue === 'medium' || currentValue === 'high') &&
									'bg-accent-foreground/50 border-transparent'
							)}
						/>

						<div
							className={cn(
								dotBaseClass,
								'bg-accent-foreground/50 border-transparent'
							)}
						/>
					</div>
				</Button>
			</SelectTrigger>
			<SelectContent className="rounded-lg">
				{options.map((m) => (
					<SelectItem
						className="cursor-pointer"
						key={m.value}
						value={m.value}>
						{m.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
