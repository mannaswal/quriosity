import { deleteFromUploadThing } from '@/app/api/uploadthing/route';
import { ModelId } from '@/lib/models';
import { ReasoningEffort, TempAttachment } from '@/lib/types';
import { mimeTypeToAttachmentType } from '@/lib/utils';
import { toast } from 'sonner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TempDataState = {
	inputText: string;
	model: ModelId | undefined;
	reasoningEffort: ReasoningEffort | undefined;
	attachments: TempAttachment[];
};

type TempDataActions = {
	setInputText: (text: string) => void;
	setModel: (model: ModelId) => void;
	setReasoningEffort: (effort: ReasoningEffort) => void;
	addUploadedAttachment: (attachment: TempAttachment) => void;
	addOptimisticAttachment: (file: File) => void;
	removeAttachment: (name: string) => void;
	clearAttachments: () => void;
};

type TempDataStore = TempDataState & {
	actions: TempDataActions;
};

const useTempDataStore = create<TempDataStore>()(
	persist(
		(set, get) => ({
			inputText: '',
			model: undefined,
			reasoningEffort: undefined,
			attachments: [],
			actions: {
				setInputText: (text: string) => set({ inputText: text }),
				setModel: (model: ModelId) => set({ model }),
				setReasoningEffort: (effort: ReasoningEffort) =>
					set({ reasoningEffort: effort }),
				addUploadedAttachment: (attachment: TempAttachment) => {
					const currentAttachments = get().attachments;
					const attachmentIndex = currentAttachments.findIndex(
						(att) => att.name === attachment.name
					);

					let newAttachments;
					if (attachmentIndex !== -1) {
						// Replace existing attachment
						newAttachments = [
							...currentAttachments.slice(0, attachmentIndex),
							attachment,
							...currentAttachments.slice(attachmentIndex + 1),
						];
					} else {
						// Add new attachment
						newAttachments = [...currentAttachments, attachment];
					}

					console.log('attachments', newAttachments);
					set({ attachments: newAttachments });
				},
				addOptimisticAttachment: (file: File) =>
					set((state) => ({
						attachments: [
							...state.attachments,
							{
								name: file.name,
								uploaded: false,
								type: mimeTypeToAttachmentType(file.type),
							},
						],
					})),
				removeAttachment: (name: string) => {
					const currentAttachments = get().attachments;
					const attachment = currentAttachments.find(
						(att) => att.name === name
					);
					if (attachment && attachment.uploaded) {
						const newAttachments = currentAttachments.filter(
							(att) => att.name !== name
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

export const useAllAttachmentsUploaded = () => {
	const attachments = useTempAttachments();
	return attachments.every((att) => att.uploaded);
};
