import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useUpdateLastModelUsed } from '@/hooks/use-user';
import { ModelId, models } from '@/lib/models';
import { useCallback } from 'react';
import { useThreadId, useUpdateThreadModel } from '@/hooks/use-threads';
import { useModel } from '@/hooks/use-model';

export const ModelSelector = () => {
	const model = useModel();
	const threadId = useThreadId();
	const updateLastModelUsed = useUpdateLastModelUsed();
	const updateThreadModelMutation = useUpdateThreadModel();

	const handleModelChange = useCallback(
		async (model: ModelId) => {
			await updateLastModelUsed({ model });

			if (threadId)
				await updateThreadModelMutation({
					threadId,
					model,
				});
		},
		[threadId, updateThreadModelMutation, updateLastModelUsed]
	);

	return (
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
	);
};
