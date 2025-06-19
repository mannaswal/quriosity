import { ConvexErrorBoundary } from '@/components/error/convex-error-boundary';

export default function ProjectsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ConvexErrorBoundary context="project">
			<div className="max-w-5xl mx-auto px-4 pb-8 pt-16">{children}</div>
		</ConvexErrorBoundary>
	);
}
