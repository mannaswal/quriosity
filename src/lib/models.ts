export type ModelProvider =
	| 'google'
	| 'openai'
	| 'anthropic'
	| 'meta'
	| 'deepseek'
	| 'xai'
	| 'alibaba';

export const providerModelNames: Record<ModelProvider, string> = {
	google: 'Gemini',
	openai: 'GPT',
	anthropic: 'Claude',
	meta: 'Llama',
	deepseek: 'DeepSeek',
	xai: 'Grok',
	alibaba: 'Qwen',
};

/**
 * Describes the properties and capabilities of a single AI model.
 */
export type ModelProperty = {
	/** The company that provides the model. */
	provider: ModelProvider;
	/** The user-friendly display name of the model. */
	name: string;
	/** The unique identifier string for the model. */
	id: ModelId;
	/** Whether the model has vision (image input) capabilities. */
	vision?: boolean;
	/** Whether the model can perform web searches. */
	webSearch?: boolean;
	/** Whether the model supports file docs. */
	docs?: boolean;
	/** Whether the model has enhanced reasoning capabilities. */
	reasoning?: boolean;
	/** Whether the model supports effort control. */
	effortControl?: boolean;
	/** Whether the model is optimized for speed. */
	fast?: boolean;
	/** Whether the model is considered experimental or in preview. */
	experimental?: boolean;
};

export const modelsData: Record<ModelId, ModelProperty> = {
	'google/gemini-2.5-flash-preview-05-20': {
		provider: 'google' as ModelProvider,
		name: 'Gemini 2.5 Flash',
		id: 'google/gemini-2.5-flash-preview-05-20' as const,
		vision: true,
		webSearch: true,
		docs: true,
	},
	'google/gemini-2.5-flash-preview-05-20:thinking': {
		provider: 'google' as ModelProvider,
		name: 'Gemini 2.5 Flash (Thinking)',
		id: 'google/gemini-2.5-flash-preview-05-20:thinking' as const,
		vision: true,
		webSearch: true,
		docs: true,
		reasoning: true,
		effortControl: true,
	},
	'google/gemini-2.5-pro-preview-05-06': {
		provider: 'google' as ModelProvider,
		name: 'Gemini 2.5 Pro',
		id: 'google/gemini-2.5-pro-preview-05-06' as const,
		vision: true,
		webSearch: true,
		docs: true,
		reasoning: true,
		effortControl: true,
		experimental: true,
	},
	'openai/o4-mini': {
		provider: 'openai' as ModelProvider,
		name: 'o4-mini',
		id: 'openai/o4-mini' as const,
		vision: true,
		docs: true,
		reasoning: true,
		effortControl: true,
	},
	'anthropic/claude-sonnet-4': {
		provider: 'anthropic' as ModelProvider,
		name: 'Claude 4 Sonnet',
		id: 'anthropic/claude-sonnet-4' as const,
		vision: true,
		docs: true,
		reasoning: true,
		effortControl: true,
	},
	// 'anthropic/claude-sonnet-4:reasoning': {
	// 	provider: 'anthropic' as ModelProvider,
	// 	name: 'Claude 4 Sonnet (Reasoning)',
	// 	id: 'anthropic/claude-sonnet-4:reasoning' as const,
	// 	vision: true,
	// 	docs: true,
	// 	reasoning: true,
	// 	effortControl: true,
	// },
	'google/gemini-2.0-flash-001': {
		provider: 'google' as ModelProvider,
		name: 'Gemini 2.0 Flash',
		id: 'google/gemini-2.0-flash-001' as const,
		vision: true,
		webSearch: true,
		docs: true,
	},
	'google/gemini-2.0-flash-lite-001': {
		provider: 'google' as ModelProvider,
		name: 'Gemini 2.0 Flash Lite',
		id: 'google/gemini-2.0-flash-lite-001' as const,
		vision: true,
		docs: true,
		fast: true,
		experimental: true,
	},
	'openai/gpt-4o-mini': {
		provider: 'openai' as ModelProvider,
		name: 'GPT-4o mini',
		id: 'openai/gpt-4o-mini' as const,
		vision: true,
		docs: true,
	},
	'openai/gpt-4o-2024-11-20': {
		provider: 'openai' as ModelProvider,
		name: 'GPT-4o',
		id: 'openai/gpt-4o-2024-11-20' as const,
		vision: true,
		docs: true,
	},
	'openai/gpt-4.1': {
		provider: 'openai' as ModelProvider,
		name: 'GPT-4.1',
		id: 'openai/gpt-4.1' as const,
		vision: true,
		docs: true,
	},
	'openai/gpt-4.1-mini': {
		provider: 'openai' as ModelProvider,
		name: 'GPT-4.1 Mini',
		id: 'openai/gpt-4.1-mini' as const,
		vision: true,
		docs: true,
	},
	'openai/gpt-4.1-nano': {
		provider: 'openai' as ModelProvider,
		name: 'GPT-4.1 Nano',
		id: 'openai/gpt-4.1-nano' as const,
		vision: true,
		docs: true,
	},
	'openai/o3-mini': {
		provider: 'openai' as ModelProvider,
		name: 'o3-mini',
		id: 'openai/o3-mini' as const,
		reasoning: true,
		effortControl: true,
	},
	'openai/o3': {
		provider: 'openai' as ModelProvider,
		name: 'o3',
		id: 'openai/o3' as const,
		vision: true,
		docs: true,
		reasoning: true,
		effortControl: true,
	},
	'openai/o3-pro': {
		provider: 'openai' as ModelProvider,
		name: 'o3 Pro',
		id: 'openai/o3-pro' as const,
		vision: true,
		docs: true,
		reasoning: true,
		effortControl: true,
	},
	'anthropic/claude-3.5-sonnet-20240620': {
		provider: 'anthropic' as ModelProvider,
		name: 'Claude 3.5 Sonnet',
		id: 'anthropic/claude-3.5-sonnet-20240620' as const,
		vision: true,
		docs: true,
	},
	'anthropic/claude-3.7-sonnet': {
		provider: 'anthropic' as ModelProvider,
		name: 'Claude 3.7 Sonnet',
		id: 'anthropic/claude-3.7-sonnet' as const,
		vision: true,
		docs: true,
	},
	'anthropic/claude-3.7-sonnet:thinking': {
		provider: 'anthropic' as ModelProvider,
		name: 'Claude 3.7 Sonnet (Reasoning)',
		id: 'anthropic/claude-3.7-sonnet:thinking' as const,
		vision: true,
		docs: true,
		reasoning: true,
		effortControl: true,
	},
	'anthropic/claude-opus-4': {
		provider: 'anthropic' as ModelProvider,
		name: 'Claude 4 Opus',
		id: 'anthropic/claude-opus-4' as const,
		vision: true,
		docs: true,
		reasoning: true,
	},
	'meta-llama/llama-3.3-70b-instruct': {
		provider: 'meta' as ModelProvider,
		name: 'Llama 3.3 70b',
		id: 'meta-llama/llama-3.3-70b-instruct' as const,
		fast: true,
		experimental: true,
	},
	'meta-llama/llama-4-scout': {
		provider: 'meta' as ModelProvider,
		name: 'Llama 4 Scout',
		id: 'meta-llama/llama-4-scout' as const,
		vision: true,
		experimental: true,
	},
	'meta-llama/llama-4-maverick': {
		provider: 'meta' as ModelProvider,
		name: 'Llama 4 Maverick',
		id: 'meta-llama/llama-4-maverick' as const,
		vision: true,
		experimental: true,
	},
	'deepseek/deepseek-chat-v3-0324': {
		provider: 'deepseek' as ModelProvider,
		name: 'DeepSeek v3',
		id: 'deepseek/deepseek-chat-v3-0324' as const,
		experimental: true,
	},
	'deepseek/deepseek-r1-0528': {
		provider: 'deepseek' as ModelProvider,
		name: 'DeepSeek R1 (0528)',
		id: 'deepseek/deepseek-r1-0528' as const,
		reasoning: true,
	},
	'deepseek/deepseek-r1-distill-qwen-32b': {
		provider: 'deepseek' as ModelProvider,
		name: 'DeepSeek R1 (Qwen Distilled)',
		id: 'deepseek/deepseek-r1-distill-qwen-32b' as const,
		reasoning: true,
	},
	'deepseek/deepseek-r1-distill-llama-70b': {
		provider: 'deepseek' as ModelProvider,
		name: 'DeepSeek R1 (Llama Distilled)',
		id: 'deepseek/deepseek-r1-distill-llama-70b' as const,
		reasoning: true,
		fast: true,
	},
	'x-ai/grok-3-beta': {
		provider: 'xai' as ModelProvider,
		name: 'Grok 3',
		id: 'x-ai/grok-3-beta' as const,
		experimental: true,
	},
	'x-ai/grok-3-mini-beta': {
		provider: 'xai' as ModelProvider,
		name: 'Grok 3 Mini',
		id: 'x-ai/grok-3-mini-beta' as const,
		reasoning: true,
		effortControl: true,
	},
	'qwen/qwq-32b': {
		provider: 'alibaba' as ModelProvider,
		name: 'Qwen QwQ-32b',
		id: 'qwen/qwq-32b' as const,
		reasoning: true,
	},
	'qwen/qwen2.5-vl-32b-instruct': {
		provider: 'alibaba' as ModelProvider,
		name: 'Qwen 2.5 32b',
		id: 'qwen/qwen2.5-vl-32b-instruct' as const,
		vision: true,
		fast: true,
		experimental: true,
	},
	'openai/gpt-4.5-preview': {
		provider: 'openai' as ModelProvider,
		name: 'GPT-4.5',
		id: 'openai/gpt-4.5-preview' as const,
		vision: true,
		docs: true,
	},
};

export const models = Object.values(modelsData);

export type ModelId =
	// Google
	| 'google/gemini-2.5-flash-preview-05-20'
	| 'google/gemini-2.5-flash-preview-05-20:thinking'
	| 'google/gemini-2.5-pro-preview-05-06'
	| 'google/gemini-2.0-flash-001'
	| 'google/gemini-2.0-flash-lite-001'
	// OpenAI
	| 'openai/gpt-4o-2024-11-20'
	| 'openai/gpt-4o-mini'
	| 'openai/gpt-4.1'
	| 'openai/gpt-4.1-mini'
	| 'openai/gpt-4.1-nano'
	| 'openai/o4-mini'
	| 'openai/o3-pro'
	| 'openai/o3'
	| 'openai/o3-mini'
	| 'openai/gpt-4.5-preview'
	// Anthropic
	| 'anthropic/claude-opus-4'
	| 'anthropic/claude-sonnet-4'
	| 'anthropic/claude-3.7-sonnet:thinking'
	| 'anthropic/claude-3.7-sonnet'
	| 'anthropic/claude-3.5-sonnet-20240620'
	// Meta
	| 'meta-llama/llama-3.3-70b-instruct'
	| 'meta-llama/llama-4-scout'
	| 'meta-llama/llama-4-maverick'
	// DeepSeek
	| 'deepseek/deepseek-chat-v3-0324'
	| 'deepseek/deepseek-r1-0528'
	| 'deepseek/deepseek-r1-distill-llama-70b'
	| 'deepseek/deepseek-r1-distill-qwen-32b'
	// X-AI
	| 'x-ai/grok-3-beta'
	| 'x-ai/grok-3-mini-beta'
	// Alibaba
	| 'qwen/qwq-32b'
	| 'qwen/qwen2.5-vl-32b-instruct';
