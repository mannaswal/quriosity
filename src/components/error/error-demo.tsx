'use client';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { ConvexErrorBoundary } from '@/components/error/convex-error-boundary';

/**
 * Demo component to showcase the error handling system
 * This can be used for testing different error scenarios
 */
export function ErrorHandlingDemo() {
	const { handleError } = useErrorHandler({
		context: 'thread',
		action: 'demo operation',
	});

	const triggerError = (errorType: string) => {
		let error: Error;

		switch (errorType) {
			case 'unauthorized':
				error = new Error('Unauthorized: You can only access your own threads');
				break;
			case 'not-found':
				error = new Error('Thread not found');
				break;
			case 'not-authenticated':
				error = new Error('User not authenticated');
				break;
			case 'validation':
				error = new Error('Invalid input: Thread title cannot be empty');
				break;
			case 'network':
				error = new Error('Network connection failed');
				break;
			default:
				error = new Error('Something went wrong');
		}

		handleError(error);
	};

	const throwError = (errorType: string) => {
		switch (errorType) {
			case 'boundary-test':
				throw new Error(
					'Unauthorized: This error will be caught by the error boundary'
				);
			default:
				throw new Error('Unknown error for boundary test');
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Error Handling System Demo</CardTitle>
					<CardDescription>
						Test different error scenarios to see how the enhanced error
						handling works
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h3 className="text-lg font-semibold mb-3">
							Hook-based Error Handling
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							These errors are handled by the useErrorHandler hook with
							automatic categorization and redirects:
						</p>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => triggerError('unauthorized')}>
								Unauthorized
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => triggerError('not-found')}>
								Not Found
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => triggerError('not-authenticated')}>
								Not Authenticated
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => triggerError('validation')}>
								Validation Error
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => triggerError('network')}>
								Network Error
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => triggerError('unknown')}>
								Unknown Error
							</Button>
						</div>
					</div>

					<div>
						<h3 className="text-lg font-semibold mb-3">
							Error Boundary Testing
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							This error will be caught by the error boundary and show a
							fallback UI:
						</p>
						<ConvexErrorBoundary context="thread">
							<Button
								variant="destructive"
								size="sm"
								onClick={() => throwError('boundary-test')}>
								Trigger Boundary Error
							</Button>
						</ConvexErrorBoundary>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Error Handling Features</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<h4 className="font-semibold text-green-600 mb-2">
								✅ Implemented
							</h4>
							<ul className="space-y-1 text-sm">
								<li>• Error categorization by type</li>
								<li>• Context-aware error messages</li>
								<li>• Automatic redirects for critical errors</li>
								<li>• Enhanced Thread Guard with error boundaries</li>
								<li>• Project page error protection</li>
								<li>• Improved hook error handling</li>
								<li>• Toast message improvements</li>
								<li>• Development error details</li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold text-blue-600 mb-2">
								📋 Next: Phase 3
							</h4>
							<ul className="space-y-1 text-sm">
								<li>• Hook enhancement completion</li>
								<li>• Retry mechanisms</li>
								<li>• Loading state management</li>
								<li>• Error recovery flows</li>
								<li>• Performance optimizations</li>
								<li>• Edge case handling</li>
								<li>• User experience refinements</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
