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
		// modelData && modelData.effortControl
		// 	?
		(thread?.reasoningEffort ??
			user?.lastReasoningEffortUsed ??
			tempReasoningEffort) as ReasoningEffort;
	// : undefined;

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
	const { setModel, setReasoningEffort } = useTempActions();
	const updateLastModelUsed = useUpdateLastModelUsed();
	const updateThreadModelMutation = useUpdateThreadModel();
	const getReasoningEffort = useReasoningEffort();

	return async ({
		model,
		reasoningEffort,
	}: {
		model?: ModelId;
		reasoningEffort?: ReasoningEffort;
	}) => {
		if (model) {
			setModel(model);
			const allowedEffort = getReasoningEffort(model, reasoningEffort);
			console.log('allowedEffort', allowedEffort);

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

/**
 * Hook for getting the reasoning effort for a model
 * If the model supports effort control, and the reasoning effort is provided,
 * the reasoning effort will be returned.
 * If the model supports effort control, but no reasoning effort is provided,
 * the current reasoning effort will be returned.
 * If the model does not support effort control, the reasoning effort will be undefined.
 *
 * Handles the grok-3-mini-beta model, which does not support medium effort.
 *
 * @returns The reasoning effort for a model
 */
export const useReasoningEffort = () => {
	const { reasoningEffort: currentReasoningEffort } = useModel();

	const getReasoningEffort = (
		model: ModelId,
		reasoningEffort: ReasoningEffort | undefined
	) => {
		// only for models that support effort control
		if (modelsData[model]?.effortControl) {
			const effort = reasoningEffort ?? currentReasoningEffort; // if no reasoning effort is provided, use the current reasoning effort
			if (model === 'x-ai/grok-3-mini-beta') {
				// grok-3-mini-beta doesn't support medium effort
				return effort === 'medium' ? 'low' : effort;
			}
			return effort;
		}

		return undefined;
	};

	return getReasoningEffort;
};
