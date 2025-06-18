import { ModelProvider } from './models';

import ClaudeLogo from '@/lib/assets/Claude.svg';
import DeepSeekLogo from '@/lib/assets/DeepSeek.svg';
import GeminiLogo from '@/lib/assets/Gemini.svg';
import GrokLogo from '@/lib/assets/Grok.svg';
import LlamaLogo from '@/lib/assets/Llama.svg';
import OpenAILogo from '@/lib/assets/OpenAI.svg';
import QwenLogo from '@/lib/assets/Qwen.svg';
import Image from 'next/image';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const modelProviderLogos: Record<
	ModelProvider,
	{ monochrome: React.ReactNode }
> = {
	google: {
		monochrome: (
			<Image
				src={GeminiLogo}
				alt="Gemini"
				width={16}
				height={16}
			/>
		),
	},
	openai: {
		monochrome: (
			<Image
				src={OpenAILogo}
				alt="OpenAI"
				width={16}
				height={16}
			/>
		),
	},
	anthropic: {
		monochrome: (
			<Image
				src={ClaudeLogo}
				alt="Claude"
				width={16}
				height={16}
			/>
		),
	},
	meta: {
		monochrome: (
			<Image
				src={LlamaLogo}
				alt="Llama"
				width={16}
				height={16}
			/>
		),
	},
	deepseek: {
		monochrome: (
			<Image
				src={DeepSeekLogo}
				alt="DeepSeek"
				width={16}
				height={16}
			/>
		),
	},
	xai: {
		monochrome: (
			<Image
				src={GrokLogo}
				alt="Grok"
				width={16}
				height={16}
			/>
		),
	},
	alibaba: {
		monochrome: (
			<Image
				src={QwenLogo}
				alt="Qwen"
				width={16}
				height={16}
			/>
		),
	},
};
