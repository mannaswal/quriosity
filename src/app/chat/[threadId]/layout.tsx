export default async function ChatLayout({
	params,
	children,
}: {
	params: Promise<{ threadId: string }>;
	children: React.ReactNode;
}) {
	const threadId = (await params).threadId;

	return (
		<div className="mx-auto w-3xl h-screen max-h-screen relative">
			{children}
		</div>
	);
}
