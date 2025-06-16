import { useMemo } from 'react';
import { ModelProperty, modelsData, models, ModelId } from '@/lib/models';
import { hasVision, hasDocs } from '@/lib/utils';
import { TempAttachment } from '@/lib/types';

/**
 * Hook to filter models based on attachment requirements
 * Separates models into compatible and incompatible based on their capabilities
 */
export function useModelFiltering(attachments: TempAttachment[] = []) {
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
		const restrictions = [];
		if (needsVision) restrictions.push('vision');
		if (needsDocs) restrictions.push('docs');

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
	modelId: string | undefined,
	attachments: TempAttachment[] = []
) {
	return useMemo(() => {
		if (!modelId) return true;

		const needsVision = attachments.some((att) => att.type === 'image');
		const needsDocs = attachments.some((att) => att.type === 'pdf');

		const canHandleVision = hasVision(modelId as ModelId);
		const canHandleDocs = hasDocs(modelId as ModelId);

		return (!needsVision || canHandleVision) && (!needsDocs || canHandleDocs);
	}, [modelId, attachments]);
}

/**
 * Generate a human-readable message about model restrictions
 */
export function getRestrictionsMessage(restrictions: string[]): string {
	if (restrictions.length === 0) return '';

	const messages = [];
	if (restrictions.includes('vision')) {
		messages.push('images require vision models');
	}
	if (restrictions.includes('docs')) {
		messages.push('PDFs require document models');
	}

	if (messages.length === 1) {
		return `Note: ${messages[0]}`;
	} else if (messages.length === 2) {
		return `Note: ${messages[0]} and ${messages[1]}`;
	}

	return '';
}
