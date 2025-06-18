import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

export function TooltipWrapper({
	children,
	tooltip,
	defaultOpen,
	delayDuration,
	align = 'center',
	side = 'top',
	sideOffset = 0,
	alignOffset = 0,
}: {
	children: React.ReactNode;
	tooltip: React.ReactNode | string;
	defaultOpen?: boolean;
	delayDuration?: number;
	align?: 'center' | 'start' | 'end';
	side?: 'top' | 'right' | 'bottom' | 'left';
	sideOffset?: number;
	alignOffset?: number;
}) {
	return (
		<Tooltip
			defaultOpen={defaultOpen}
			delayDuration={delayDuration}>
			<TooltipTrigger asChild>
				<div>{children}</div>
			</TooltipTrigger>
			<TooltipContent
				align={align}
				side={side}
				sideOffset={sideOffset}
				alignOffset={alignOffset}>
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);
}
