import { ModelProvider } from './models';

export const modelProviderLogos: Record<
	ModelProvider,
	{
		monochrome: {
			src: string;
			className?: string;
		};
		colored: {
			src: string;
			className?: string;
		};
	}
> = {
	google: {
		monochrome: {
			src: '/logos/monochrome/Gemini.svg',
			className: 'invert opacity-50',
		},
		colored: {
			src: '/logos/colored/Gemini.svg',
		},
	},
	openai: {
		monochrome: {
			src: '/logos/monochrome/OpenAI.svg',
			className: 'invert opacity-50',
		},
		colored: {
			src: '/logos/colored/OpenAI.svg',
			className: 'invert opacity-80',
		},
	},
	anthropic: {
		monochrome: {
			src: '/logos/monochrome/Claude.svg',
			className: 'invert opacity-50',
		},
		colored: {
			src: '/logos/colored/Claude.svg',
		},
	},
	meta: {
		monochrome: {
			src: '/logos/monochrome/Llama.svg',
			className: 'invert opacity-50',
		},
		colored: {
			src: '/logos/colored/Llama.svg',
		},
	},
	deepseek: {
		monochrome: {
			src: '/logos/monochrome/DeepSeek.svg',
			className: 'invert opacity-50',
		},
		colored: {
			src: '/logos/colored/DeepSeek.svg',
		},
	},
	xai: {
		monochrome: {
			src: '/logos/monochrome/Grok.svg',
			className: 'invert opacity-50',
		},
		colored: {
			src: '/logos/colored/Grok.svg',
			className: 'invert opacity-80',
		},
	},
	alibaba: {
		monochrome: {
			src: '/logos/monochrome/Qwen.svg',
			className: 'invert opacity-50',
		},
		colored: {
			src: '/logos/colored/Qwen.svg',
			className: 'brightness-[1.8]',
		},
	},
};
