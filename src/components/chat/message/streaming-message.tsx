import { useEffect } from 'react';
import { Id } from '../../../../convex/_generated/dataModel';
import { useStreamingContent } from '@/lib/stores/streaming-store';
import { useStreamDetection } from '@/hooks/use-resume-stream';
import { ChatMessage } from '@/lib/types';

interface StreamingMessageProps {
	message: ChatMessage;
	threadId: Id<'threads'>;
	children?: React.ReactNode;
}

/**
 * Message component that handles streaming content display
 * Automatically detects if a stream needs to be resumed for late-joining clients
 */
export function StreamingMessage({
	message,
	threadId,
	children,
}: StreamingMessageProps) {
	const {
		content: streamingContent,
		status: streamingStatus,
		isStreaming,
	} = useStreamingContent(message._id);
	const { checkAndResumeIfNeeded } = useStreamDetection();

	// Check if this message needs to be resumed on mount and when message status changes
	useEffect(() => {
		if (message.role === 'assistant') {
			checkAndResumeIfNeeded(
				message._id,
				threadId,
				message.status || 'complete',
				streamingStatus
			);
		}
	}, [
		message._id,
		message.status,
		streamingStatus,
		threadId,
		checkAndResumeIfNeeded,
	]);

	// Determine what content to display
	const displayContent = (() => {
		// If we have streaming content, use it
		if (streamingContent) {
			return streamingContent;
		}

		// If message is in progress but no streaming content, show placeholder
		if (message.status === 'in_progress') {
			return '';
		}

		// Otherwise use the message content from database
		return message.content;
	})();

	// Determine if we should show streaming indicator
	const showStreamingIndicator =
		isStreaming || (message.status === 'in_progress' && !streamingContent);

	return (
		<div className="streaming-message">
			{/* Message content */}
			<div className="message-content">
				{displayContent}
				{showStreamingIndicator && (
					<span className="streaming-cursor animate-pulse">▊</span>
				)}
			</div>

			{/* Stream status indicator (for debugging) */}
			{process.env.NODE_ENV === 'development' && streamingStatus && (
				<div className="text-xs text-gray-500 mt-1">
					Stream: {streamingStatus}
					{streamingContent && ` (${streamingContent.length} chars)`}
				</div>
			)}

			{/* Additional children (like action buttons) */}
			{children}
		</div>
	);
}

/**
 * Hook to get the appropriate content for a message
 * Handles the logic of choosing between streaming content and database content
 */
export function useMessageContent(
	messageId: Id<'messages'>,
	databaseContent: string,
	status?: string
) {
	const {
		content: streamingContent,
		isStreaming,
		status: streamingStatus,
	} = useStreamingContent(messageId);

	return {
		content: isStreaming
			? streamingContent
			: databaseContent || streamingContent,
		isStreaming,
		hasStreamingContent: !!streamingContent,
		isPending: status === 'in_progress' && !streamingContent,
	};
}

/**
 * Simple streaming cursor component
 */
export function StreamingCursor({ show }: { show: boolean }) {
	if (!show) return null;

	return (
		<span className="streaming-cursor animate-pulse ml-1 text-blue-500">▊</span>
	);
}
