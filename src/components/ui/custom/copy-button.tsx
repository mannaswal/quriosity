import { useState } from 'react';
import { Button } from '../button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CopyButton({
	className,
	content,
	iconClassName,
}: {
	className?: string;
	content: string;
	iconClassName?: string;
}) {
	const [isCopied, setIsCopied] = useState(false);

	const handleCopy = () => {
		console.log(content);
		navigator.clipboard.writeText(content);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			className={className}
			onClick={handleCopy}>
			{isCopied ? (
				<CheckIcon className={cn('size-4', iconClassName)} />
			) : (
				<CopyIcon className={cn('size-4', iconClassName)} />
			)}
		</Button>
	);
}
