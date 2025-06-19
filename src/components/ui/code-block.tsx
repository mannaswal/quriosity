'use client';

import { cn } from '@/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { BundledTheme, codeToHtml } from 'shiki';
import { Button } from './button';
import { CopyButton } from './custom/copy-button';

export type CodeBlockProps = {
	children?: React.ReactNode;
	className?: string;
	language?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
	return (
		<div
			className={cn(
				'not-prose flex w-full flex-col border-[0.5px] overflow-clip my-4',
				'border-border bg-card text-card-foreground rounded-xl',
				'relative',
				className
			)}
			{...props}>
			{children}
		</div>
	);
}

export type CodeBlockCodeProps = {
	code: string;
	language?: string;
	theme?: BundledTheme;
	className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlockCode({
	code,
	language = 'tsx',
	theme = 'github-dark',
	className,
	...props
}: CodeBlockCodeProps) {
	const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

	useEffect(() => {
		async function highlight() {
			if (!code) {
				setHighlightedHtml('<pre><code></code></pre>');
				return;
			}

			const html = await codeToHtml(code, {
				lang: language,
				theme,
			});
			setHighlightedHtml(html);
		}
		highlight();
	}, [code, language, theme]);

	const classNames = cn(
		'w-fit min-w-full text-[13px] [&>pre]:px-4 [&>pre]:py-4',
		className
	);

	// SSR fallback: render plain code if not hydrated yet
	return (
		<>
			<div className="w-full flex justify-between items-center h-10">
				<div className="text-sm text-muted-foreground px-4 font-mono">
					{language}
				</div>
			</div>
			<div className="sticky h-0 left-auto ml-auto z-20 top-10">
				<div className="absolute -top-[34px] -left-[34px]">
					<CopyButton
						content={code}
						className="size-7 bg-card"
						iconClassName="size-3.5"
					/>
				</div>
			</div>

			<div className="w-full overflow-x-auto">
				{highlightedHtml ? (
					<div
						className={classNames}
						dangerouslySetInnerHTML={{ __html: highlightedHtml }}
						{...props}
					/>
				) : (
					<div
						className={classNames}
						{...props}>
						<pre className="">
							<code>{code}</code>
						</pre>
					</div>
				)}
			</div>
		</>
	);
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>;

function CodeBlockGroup({
	children,
	className,
	...props
}: CodeBlockGroupProps) {
	return (
		<div
			className={cn('flex items-center justify-between', className)}
			{...props}>
			{children}
		</div>
	);
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock };
