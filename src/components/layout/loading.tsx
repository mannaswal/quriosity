import { Loader } from '../ui/loader';

export const Loading = ({ message = 'Loading' }: { message?: string }) => {
	return (
		<div className="flex flex-col items-center justify-center h-screen gap-2 absolute left-0 top-0 w-full">
			<Loader
				variant="pulse"
				className="size-5"
			/>
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	);
};
