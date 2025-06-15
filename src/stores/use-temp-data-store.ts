import { ModelId } from '@/lib/models';
import { ReasoningEffort } from '@/lib/types';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TempDataState = {
	inputText: string;
	model: ModelId | undefined;
	reasoningEffort: ReasoningEffort | undefined;
};

type TempDataActions = {
	setInputText: (text: string) => void;
	setModel: (model: ModelId) => void;
	setReasoningEffort: (effort: ReasoningEffort) => void;
};

type TempDataStore = TempDataState & {
	actions: TempDataActions;
};

const useTempDataStore = create<TempDataStore>()(
	persist(
		(set) => ({
			inputText: '',
			model: undefined,
			reasoningEffort: undefined,
			actions: {
				setInputText: (text: string) => set({ inputText: text }),
				setModel: (model: ModelId) => set({ model }),
				setReasoningEffort: (effort: ReasoningEffort) =>
					set({ reasoningEffort: effort }),
			},
		}),
		{
			name: 'temp-input-data',
			partialize: (state) => ({
				inputText: state.inputText,
				model: state.model,
				reasoningEffort: state.reasoningEffort,
			}),
		}
	)
);

export const useTempInputText = () =>
	useTempDataStore((state) => state.inputText);

export const useTempModel = () => useTempDataStore((state) => state.model);

export const useTempReasoningEffort = () =>
	useTempDataStore((state) => state.reasoningEffort);

export const useTempActions = () => useTempDataStore((state) => state.actions);
