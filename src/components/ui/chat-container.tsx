'use client';

import { cn } from '@/lib/utils';
import { StickToBottom, useStickToBottom } from 'use-stick-to-bottom';
import { useState, useEffect } from 'react';

export type ChatContainerRootProps = {
	children: React.ReactNode;
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export type ChatContainerContentProps = {
	children: React.ReactNode;
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export type ChatContainerScrollAnchorProps = {
	className?: string;
	ref?: React.RefObject<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>;

function ChatContainerRoot({
	children,
	className,
	...props
}: ChatContainerRootProps) {
	return (
		<StickToBottom
			className={cn('flex overflow-y-auto ', className)}
			resize="smooth"
			initial="instant"
			role="log"
			// damping={0}
			{...props}>
			{children}
		</StickToBottom>
	);
}

function ChatContainerContent({
	children,
	className,
	...props
}: ChatContainerContentProps) {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setIsReady(true), 80);
		return () => clearTimeout(timer);
	}, []);

	return (
		<StickToBottom.Content
			className={cn(
				'flex w-full flex-col transition-opacity duration-200',
				isReady ? 'opacity-100' : 'opacity-0',
				className
			)}
			{...props}>
			{children}
		</StickToBottom.Content>
	);
}

function ChatContainerScrollAnchor({
	className,
	...props
}: ChatContainerScrollAnchorProps) {
	return (
		<div
			className={cn('h-px w-full shrink-0 scroll-mt-4', className)}
			aria-hidden="true"
			{...props}
		/>
	);
}

export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor };
