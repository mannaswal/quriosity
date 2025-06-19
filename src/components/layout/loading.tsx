import { Loader } from '../ui/loader';

export const Loading = ({ message = 'Loading' }: { message?: string }) => {
	return (
		<div className="flex flex-col items-center justify-center h-screen gap-2">
			<Loader
				variant="pulse"
				className="size-5"
			/>
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	);
};
