import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ModelId, models, modelsData } from '@/lib/models';
import { useModel, useUpdateModel } from '@/hooks/use-model';

export const ModelSelector = () => {
	const { model } = useModel();
	const updateModel = useUpdateModel();

	const handleModelChange = (model: ModelId) => {
		updateModel({ model });
	};

	return (
		<>
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
		</>
	);
};
