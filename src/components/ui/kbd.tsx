export const Kbd = ({ children }: { children: React.ReactNode }) => {
	return (
		<kbd className="bg-kbd text-muted-foreground rounded px-1 py-px text-[10px] font-sans h-5 min-w-5 text-center leading-none flex items-center justify-center border-t-[0.5px] border-l-[0.5px] border-border">
			{children}
		</kbd>
	);
};
