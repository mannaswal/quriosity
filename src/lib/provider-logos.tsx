import { ModelProvider } from './models';

import Claude from 'public/providers/Claude.svg';
import DeepSeek from 'public/providers/DeepSeek.svg';
import Gemini from 'public/providers/Gemini.svg';
import Grok from 'public/providers/Grok.svg';
import Llama from 'public/providers/Llama.svg';
import OpenAI from 'public/providers/OpenAI.svg';
import Qwen from 'public/providers/Qwen.svg';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const modelProviderLogos: Record<ModelProvider, { monochrome: any }> = {
	google: {
		monochrome: Gemini,
	},
	openai: {
		monochrome: OpenAI,
	},
	anthropic: {
		monochrome: Claude,
	},
	meta: {
		monochrome: Llama,
	},
	deepseek: {
		monochrome: DeepSeek,
	},
	xai: {
		monochrome: Grok,
	},
	alibaba: {
		monochrome: Qwen,
	},
};
