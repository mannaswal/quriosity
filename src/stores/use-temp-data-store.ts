import { deleteFromUploadThing } from '@/app/api/uploadthing/route';
import { DEFAULT_MODEL, ModelId } from '@/lib/models';
import { ReasoningEffort, TempAttachment } from '@/lib/types';
import { mimeTypeToAttachmentType } from '@/lib/utils';
import { toast } from 'sonner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Id } from '../../convex/_generated/dataModel';

/**
 * Create a unique fingerprint for a file based on its properties
 * This allows us to match optimistic attachments with upload results
 */
export const createFileFingerprint = (
	name: string,
	size: number,
	lastModified: number
): string => {
	return `${name}-${size}-${lastModified}`;
};

/**
 * Create fingerprint from File object
 */
export const createFileFingerprintFromFile = (file: File): string => {
	return createFileFingerprint(file.name, file.size, file.lastModified);
};

export type TempDataState = {
	inputText: string;
	model: ModelId;
	reasoningEffort: ReasoningEffort | undefined;
	attachments: TempAttachment[];
	selectedProjectId: Id<'projects'> | undefined;
};

type TempDataActions = {
	setInputText: (text: string) => void;
	setModel: (model: ModelId) => void;
	setReasoningEffort: (effort: ReasoningEffort) => void;
	addUploadedAttachment: (attachment: TempAttachment) => void;
	addOptimisticAttachment: (file: File, processedName: string) => void;
	removeAttachment: (fingerprint: string) => void;
	clearAttachments: () => void;
	setSelectedProjectId: (projectId: Id<'projects'> | undefined) => void;
};

type TempDataStore = TempDataState & {
	actions: TempDataActions;
};

const useTempDataStore = create<TempDataStore>()(
	persist(
		(set, get) => ({
			inputText: '',
			model: DEFAULT_MODEL,
			reasoningEffort: undefined,
			attachments: [],
			selectedProjectId: undefined,
			actions: {
				setInputText: (text: string) => set({ inputText: text }),
				setModel: (model: ModelId) => set({ model }),
				setReasoningEffort: (effort: ReasoningEffort) =>
					set({ reasoningEffort: effort }),
				setSelectedProjectId: (projectId: Id<'projects'> | undefined) =>
					set({ selectedProjectId: projectId }),
				addUploadedAttachment: (attachment: TempAttachment) => {
					const currentAttachments = get().attachments;
					const attachmentIndex = currentAttachments.findIndex(
						(att) => att.fingerprint === attachment.fingerprint
					);

					let newAttachments;
					if (attachmentIndex !== -1) {
						// Replace existing optimistic attachment with real data
						newAttachments = [
							...currentAttachments.slice(0, attachmentIndex),
							attachment,
							...currentAttachments.slice(attachmentIndex + 1),
						];
					} else {
						// Add new attachment (shouldn't happen in normal flow)
						newAttachments = [...currentAttachments, attachment];
					}

					console.log('attachments', newAttachments);
					set({ attachments: newAttachments });
				},
				addOptimisticAttachment: (file: File, processedName: string) => {
					const fingerprint = createFileFingerprintFromFile(file);
					set((state) => ({
						attachments: [
							...state.attachments,
							{
								fingerprint,
								name: processedName, // Use processed name (with jpg→jpeg conversion)
								uploaded: false,
								type: mimeTypeToAttachmentType(file.type),
								mimeType: file.type,
							},
						],
					}));
				},
				removeAttachment: (fingerprint: string) => {
					const currentAttachments = get().attachments;
					const attachment = currentAttachments.find(
						(att) => att.fingerprint === fingerprint
					);
					if (attachment && attachment.uploaded) {
						const newAttachments = currentAttachments.filter(
							(att) => att.fingerprint !== fingerprint
						);
						set({ attachments: newAttachments });

						deleteFromUploadThing(attachment.uploadThingKey)
							.then(() => {
								toast.success('Deleted attachment');
							})
							.catch((error) => {
								toast.error('Failed to delete attachment');
								// Add attachment back to temp store
								set({ attachments: currentAttachments });
							});
					} else {
						// Just remove optimistic attachment
						const newAttachments = currentAttachments.filter(
							(att) => att.fingerprint !== fingerprint
						);
						set({ attachments: newAttachments });
					}
				},
				clearAttachments: () => set({ attachments: [] }),
			},
		}),
		{
			name: 'temp-input-data',
			partialize: (state) => ({
				inputText: state.inputText,
				model: state.model,
				reasoningEffort: state.reasoningEffort,
				attachments: state.attachments,
				selectedProjectId: state.selectedProjectId,
			}),
		}
	)
);

export const useTempInputText = () =>
	useTempDataStore((state) => state.inputText);

export const useTempModel = () => useTempDataStore((state) => state.model);

export const useTempReasoningEffort = () =>
	useTempDataStore((state) => state.reasoningEffort);

export const useTempAttachments = () =>
	useTempDataStore((state) => state.attachments);

export const useTempActions = () => useTempDataStore((state) => state.actions);

export const useTempSelectedProjectId = () =>
	useTempDataStore((state) => state.selectedProjectId);

export const useAllAttachmentsUploaded = () => {
	const attachments = useTempAttachments();
	return attachments.every((att) => att.uploaded);
};
