import { useMemo } from 'react';
import { models, modelsData, ModelProperty } from '@/lib/models';
import { hasVision, hasDocs } from '@/lib/utils';
import { Attachment, AttachmentType } from '@/lib/types';

export interface ModelFilterResult {
	filteredModels: typeof models;
	restrictions: {
		requiresVision: boolean;
		requiresDocs: boolean;
		requiresText: boolean;
		attachmentTypes: AttachmentType[];
	};
	incompatibleModels: typeof models;
}

/**
 * Hook to filter available models based on selected attachments
 * Returns filtered models, restrictions info, and incompatible models
 */
export function useModelFiltering(
	attachments: Attachment[]
): ModelFilterResult {
	return useMemo(() => {
		// If no attachments, return all models
		if (!attachments || attachments.length === 0) {
			return {
				filteredModels: models,
				restrictions: {
					requiresVision: false,
					requiresDocs: false,
					requiresText: false,
					attachmentTypes: [],
				},
				incompatibleModels: [],
			};
		}

		// Determine what capabilities are required based on attachment types
		const attachmentTypes = [...new Set(attachments.map((att) => att.type))];
		const requiresVision = attachmentTypes.includes('image');
		const requiresDocs = attachmentTypes.includes('pdf');
		const requiresText = attachmentTypes.includes('text');

		// Filter models based on requirements
		const filteredModels: ModelProperty[] = [];
		const incompatibleModels: ModelProperty[] = [];

		models.forEach((model) => {
			let isCompatible = true;

			// Check vision requirement
			if (requiresVision && !hasVision(model.id)) {
				isCompatible = false;
			}

			// Check docs requirement
			if (requiresDocs && !hasDocs(model.id)) {
				isCompatible = false;
			}

			// Text files are generally supported by any model that supports attachments
			// So we only check if the model supports ANY attachments when text is present
			if (requiresText && !hasVision(model.id) && !hasDocs(model.id)) {
				isCompatible = false;
			}

			if (isCompatible) {
				filteredModels.push(model);
			} else {
				incompatibleModels.push(model);
			}
		});

		return {
			filteredModels,
			restrictions: {
				requiresVision,
				requiresDocs,
				requiresText,
				attachmentTypes,
			},
			incompatibleModels,
		};
	}, [attachments]);
}

/**
 * Hook to check if a specific model is compatible with given attachments
 */
export function useModelCompatibility(
	attachments: Attachment[],
	modelId: string
) {
	const { filteredModels } = useModelFiltering(attachments);
	return useMemo(() => {
		return filteredModels.some((model) => model.id === modelId);
	}, [filteredModels, modelId]);
}

/**
 * Get human-readable restrictions message
 */
export function getRestrictionsMessage(
	restrictions: ModelFilterResult['restrictions']
): string {
	if (restrictions.attachmentTypes.length === 0) {
		return '';
	}

	const requirements: string[] = [];

	if (restrictions.requiresVision) {
		requirements.push('vision support');
	}

	if (restrictions.requiresDocs) {
		requirements.push('document support');
	}

	if (requirements.length === 0) {
		return 'Models with attachment support';
	}

	return `Models with ${requirements.join(' and ')}`;
}
