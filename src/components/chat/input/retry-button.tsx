import { Button } from '@/components/ui/button';
import { RefreshCcwIcon } from 'lucide-react';

interface RetryButtonProps {
	handleRegenerate: () => Promise<void>;
}

export const RetryButton = ({ handleRegenerate }: RetryButtonProps) => {
	return (
		<Button
			onClick={handleRegenerate}
			variant="ghost"
			size="icon"
			className="size-8">
			<RefreshCcwIcon className="size-4" />
		</Button>
	);
};
