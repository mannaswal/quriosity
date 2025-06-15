import { ModelId, ModelProperty, models, modelsData } from '@/lib/models';
import { useThreadId, useThreads, useUpdateThreadModel } from './use-threads';
import { useCurrentUser, useUpdateLastModelUsed } from './use-user';
import {
	useTempActions,
	useTempModel,
	useTempReasoningEffort,
} from '@/stores/use-temp-data-store';
import { ReasoningEffort } from '@/lib/types';
import { useEffect } from 'react';
import { getEffortControl } from '@/lib/utils';

/**
 * Hook for getting the model and reasoning effort for the current thread, or the user's last used model and reasoning effort, or the temp model and reasoning effort
 * @returns The model ID, reasoning effort, and model data
 */
export function useModel(): {
	model: ModelId;
	reasoningEffort: ReasoningEffort | undefined;
	modelData: ModelProperty;
} {
	const threads = useThreads();
	const threadId = useThreadId();
	const user = useCurrentUser();
	const tempModel = useTempModel();
	const { setModel, setReasoningEffort } = useTempActions();
	const tempReasoningEffort = useTempReasoningEffort();

	const thread = threads?.find((t) => t._id === threadId);

	const modelId = (thread?.model ??
		user?.lastModelUsed ??
		tempModel) as ModelId;

	const modelData = modelsData[modelId];

	const reasoning =
		modelData && modelData.reasoning
			? ((thread?.reasoningEffort ??
					user?.lastReasoningEffortUsed ??
					tempReasoningEffort) as ReasoningEffort)
			: undefined;

	useEffect(() => {
		setModel(modelId);
		setReasoningEffort(reasoning as ReasoningEffort);
	}, [modelId, reasoning]);

	return {
		model: modelId,
		reasoningEffort: reasoning,
		modelData: modelData,
	};
}

export const useUpdateModel = () => {
	const { reasoningEffort: currentReasoningEffort } = useModel();
	const { setModel, setReasoningEffort } = useTempActions();
	const updateLastModelUsed = useUpdateLastModelUsed();
	const updateThreadModelMutation = useUpdateThreadModel();

	return async ({
		model,
		reasoningEffort,
	}: {
		model?: ModelId;
		reasoningEffort?: ReasoningEffort;
	}) => {
		if (model) {
			setModel(model);
			const allowedEffort = getEffortControl(model, currentReasoningEffort);

			if (allowedEffort) {
				// if setting a reasoning model, set the reasoning effort to the allowed effort
				setReasoningEffort(allowedEffort);
			}

			await updateLastModelUsed({
				model,
				reasoningEffort: allowedEffort, // set effort, if allowed
			});
			await updateThreadModelMutation({
				model,
				reasoningEffort: allowedEffort, // set effort, if allowed
			});
		}

		if (reasoningEffort) {
			setReasoningEffort(reasoningEffort);

			await updateLastModelUsed({ reasoningEffort });
			await updateThreadModelMutation({ reasoningEffort });
		}
	};
};
