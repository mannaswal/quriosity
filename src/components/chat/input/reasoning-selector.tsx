import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useModel, useUpdateModel } from '@/hooks/use-model';
import { ReasoningEffort } from '@/lib/types';

const reasoningOptions = [
	{ label: 'Low', value: 'low' },
	{ label: 'Medium', value: 'medium' },
	{ label: 'High', value: 'high' },
] as const;

export const ReasoningSelector = () => {
	const { reasoningEffort } = useModel();
	const updateModel = useUpdateModel();

	const handleReasoningChange = (reasoningEffort: ReasoningEffort) => {
		updateModel({ reasoningEffort });
	};

	return (
		<Select
			value={reasoningEffort ?? 'medium'}
			onValueChange={(value) =>
				handleReasoningChange(value as ReasoningEffort)
			}>
			<SelectTrigger className="border-none not-hover:dark:bg-transparent">
				<SelectValue defaultValue={'medium'} />
			</SelectTrigger>
			<SelectContent>
				{reasoningOptions.map((m) => (
					<SelectItem
						key={m.value}
						value={m.value}>
						{m.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
