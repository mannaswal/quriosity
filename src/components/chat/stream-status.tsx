// import { Id } from '../../../convex/_generated/dataModel';
// import { useThreadStreamingStatus } from '@/stores/streaming-store';
// import { useThread } from '@/hooks/use-threads';
// import { Loader2, StopCircle, AlertCircle } from 'lucide-react';

// interface StreamStatusProps {
// 	threadId: Id<'threads'>;
// 	className?: string;
// }

// /**
//  * Component that displays the current streaming status for a thread
//  * Shows loading, error, or completion states
//  */
// export function StreamStatus({ threadId, className }: StreamStatusProps) {
// 	const { isStreaming, activeMessageId } = useThreadStreamingStatus(threadId);
// 	const thread = useThread();

// 	// Combine Convex and Zustand streaming status
// 	const isStreamingCombined = thread?.isStreaming || isStreaming;

// 	if (!isStreamingCombined) {
// 		return null;
// 	}

// 	return (
// 		<div
// 			className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
// 			<Loader2 className="h-4 w-4 animate-spin" />
// 			<span>AI is thinking...</span>
// 		</div>
// 	);
// }

// /**
//  * Compact stream status indicator for the chat input
//  */
// export function StreamStatusCompact({ threadId }: { threadId: Id<'threads'> }) {
// 	const { isStreaming } = useThreadStreamingStatus(threadId);
// 	const thread = useThread();

// 	const isStreamingCombined = thread?.isStreaming || isStreaming;

// 	if (!isStreamingCombined) {
// 		return null;
// 	}

// 	return (
// 		<div className="flex items-center gap-1 text-xs text-muted-foreground">
// 			<Loader2 className="h-3 w-3 animate-spin" />
// 			<span>Generating...</span>
// 		</div>
// 	);
// }

// /**
//  * Stream status with error handling
//  */
// export function StreamStatusWithError({
// 	threadId,
// 	className,
// }: {
// 	threadId: Id<'threads'>;
// 	className?: string;
// }) {
// 	const { isStreaming, activeMessageId } = useThreadStreamingStatus(threadId);
// 	const thread = useThread();

// 	const isStreamingCombined = thread?.isStreaming || isStreaming;

// 	if (!isStreamingCombined) {
// 		return null;
// 	}

// 	return (
// 		<div className={`flex items-center gap-2 text-sm ${className}`}>
// 			<div className="flex items-center gap-2">
// 				<Loader2 className="h-4 w-4 animate-spin text-blue-500" />
// 				<span className="text-muted-foreground">AI is responding...</span>
// 			</div>
// 		</div>
// 	);
// }
