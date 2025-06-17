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
}: {
	children: React.ReactNode;
	tooltip: React.ReactNode | string;
	defaultOpen?: boolean;
	delayDuration?: number;
}) {
	return (
		<Tooltip
			defaultOpen={defaultOpen}
			delayDuration={delayDuration}>
			<TooltipTrigger asChild>
				<div>{children}</div>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
