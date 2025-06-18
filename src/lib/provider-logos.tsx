import { ModelProvider } from './models';

import Claude from '@/lib/assets/Claude.svg';
import DeepSeek from '@/lib/assets/DeepSeek.svg';
import Gemini from '@/lib/assets/Gemini.svg';
import Grok from '@/lib/assets/Grok.svg';
import Llama from '@/lib/assets/Llama.svg';
import OpenAI from '@/lib/assets/OpenAI.svg';
import Qwen from '@/lib/assets/Qwen.svg';

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
