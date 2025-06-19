import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function TooltipWrapper({
	children,
	tooltip,
	defaultOpen,
	delayDuration = 400,
	align = 'center',
	side = 'top',
	sideOffset = 4,
	alignOffset = 0,
	className,
	disabled,
}: {
	children: React.ReactNode;
	tooltip: React.ReactNode | string;
	defaultOpen?: boolean;
	delayDuration?: number;
	align?: 'center' | 'start' | 'end';
	side?: 'top' | 'right' | 'bottom' | 'left';
	sideOffset?: number;
	alignOffset?: number;
	className?: string;
	disabled?: boolean;
}) {
	return (
		<Tooltip
			defaultOpen={defaultOpen}
			delayDuration={delayDuration}>
			<TooltipTrigger
				disabled={disabled}
				asChild>
				<div>{children}</div>
			</TooltipTrigger>
			<TooltipContent
				className={cn(
					'mx-1 flex items-center gap-x-1 [&_kbd]:first:ml-1',
					className
				)}
				align={align}
				side={side}
				sideOffset={sideOffset}
				alignOffset={alignOffset}>
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);
}
