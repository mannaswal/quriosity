import { useMemo } from 'react';
import {
	ModelProperty,
	modelsData,
	models,
	ModelId,
	ModelProvider,
} from '@/lib/models';
import { hasVision, hasDocs, getModelCompatibility } from '@/lib/utils';
import { AttachmentType, TempAttachment } from '@/lib/types';
import { ModelCompatibility } from './use-model';

/**
 * Hook to filter models based on attachment requirements
 * Separates models into compatible and incompatible based on their capabilities
 */
export function useModelFiltering(
	attachments: { type: AttachmentType }[] = []
): {
	filteredModels: ModelProperty[];
	incompatibleModels: ModelProperty[];
	restrictions: {
		vision: boolean;
		docs: boolean;
	};
} {
	return useMemo(() => {
		// Determine what capabilities we need based on attachments
		const needsVision = attachments.some((att) => att.type === 'image');
		const needsDocs = attachments.some((att) => att.type === 'pdf');

		const filteredModels: ModelProperty[] = [];
		const incompatibleModels: ModelProperty[] = [];

		models.forEach((data) => {
			const canHandleVision = hasVision(data.id);
			const canHandleDocs = hasDocs(data.id);

			// Check if model can handle all required capabilities
			const isCompatible =
				(!needsVision || canHandleVision) && (!needsDocs || canHandleDocs);

			if (isCompatible) {
				filteredModels.push(data);
			} else {
				incompatibleModels.push(data);
			}
		});

		// Determine which restrictions apply
		const restrictions: {
			vision: boolean;
			docs: boolean;
		} = {
			vision: needsVision,
			docs: needsDocs,
		};

		return {
			filteredModels,
			incompatibleModels,
			restrictions,
		};
	}, [attachments]);
}

/**
 * Hook to check if a specific model is compatible with the given attachments
 */
export function useModelCompatibility(
	modelId: ModelId,
	attachments: TempAttachment[] = []
) {
	return useMemo(
		() => getModelCompatibility(modelId, attachments),
		[modelId, attachments]
	);
}

/**
 * Generate a human-readable message about model restrictions
 */
export function getRestrictionsMessage(restrictions: {
	vision: boolean;
	docs: boolean;
}): string {
	if (!restrictions.vision && !restrictions.docs) return '';

	const messages = [];
	if (restrictions.vision) {
		messages.push('images require vision models');
	}
	if (restrictions.docs) {
		messages.push('PDFs require document models');
	}

	if (messages.length === 1) {
		return `Note: ${messages[0]}`;
	} else if (messages.length === 2) {
		return `Note: ${messages[0]} and ${messages[1]}`;
	}

	return '';
}

export const useModelsCompatibility = (
	attachments: { type: AttachmentType }[]
): Record<ModelId, ModelCompatibility> =>
	useMemo(() => {
		return models.reduce((acc, model) => {
			acc[model.id] = {
				...getModelCompatibility(model.id, attachments),
			};
			return acc;
		}, {} as Record<ModelId, ModelCompatibility>);
	}, [attachments]);
