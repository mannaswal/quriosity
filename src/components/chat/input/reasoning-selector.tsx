import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useModel, useUpdateModel } from '@/hooks/use-model';
import { ReasoningEffort } from '@/lib/types';
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
		if (model === 'x-ai/grok-3-mini-beta') {
			return [reasoningOptions[0], reasoningOptions[2]];
		}
		return reasoningOptions;
	}, [model]);

	return (
		<Select
			value={reasoningEffort ?? 'medium'}
			onValueChange={(value) =>
				handleReasoningChange(value as ReasoningEffort)
			}>
			<SelectTrigger className="border-none not-hover:dark:bg-transparent cursor-pointer">
				<SelectValue defaultValue={'medium'} />
			</SelectTrigger>
			<SelectContent>
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
