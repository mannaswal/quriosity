import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ModelId, modelsData } from '@/lib/models';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const canReason = (model: ModelId | undefined) =>
	(model && modelsData[model]?.reasoning) ?? false;

export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1);

export const cap = capitalize;
