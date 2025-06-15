import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ModelId, modelsData } from '@/lib/models';
import { ReasoningEffort } from './types';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const canReason = (model: ModelId | undefined) =>
	(model && modelsData[model]?.reasoning) ?? false;

export const hasEffortControl = (model: ModelId | undefined) =>
	(model && modelsData[model]?.effortControl) ?? false;

export const getEffortControl = (
	model: ModelId,
	reasoningEffort: ReasoningEffort | undefined
) => {
	// only for models that support effort control
	if (reasoningEffort && modelsData[model]?.effortControl) {
		if (model === 'x-ai/grok-3-mini-beta') {
			// grok-3-mini-beta doesn't support medium effort
			return reasoningEffort === 'medium' ? 'low' : reasoningEffort;
		}
		return reasoningEffort;
	}

	return undefined;
};

export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1);

export const cap = capitalize;
