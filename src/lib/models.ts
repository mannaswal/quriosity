export const models = [
	// {
	// 	id: 'google/gemini-2.5-pro-preview',
	// 	name: 'Gemini 2.5 Pro',
	// },
	// {
	// 	id: 'google/gemini-2.5-flash-preview-05-20',
	// 	name: 'Gemini 2.5 Flash',
	// },
	// {
	// 	id: 'google/gemini-2.5-flash-preview-05-20:thinking',
	// 	name: 'Gemini 2.5 Flash Thinking',
	// },
	{
		id: 'google/gemini-2.0-flash-001',
		name: 'Gemini 2.0 Flash',
	},
	{
		id: 'google/gemini-2.0-flash-lite-001',
		name: 'Gemini 2.0 Flash Lite',
	},
	{
		id: 'openai/gpt-4.1-mini',
		name: 'GPT-4.1 Mini',
	},
	{
		id: 'openai/gpt-4.1-nano',
		name: 'GPT-4.1 Nano',
	},
	// {
	// 	id: 'openai/o4-mini',
	// 	name: 'o4 Mini',
	// },
] as const;

export type ModelId = (typeof models)[number]['id'];
