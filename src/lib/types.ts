import { Id } from '../../convex/_generated/dataModel';

export interface ChatMessage {
	_id: Id<'messages'>;
	_creationTime: number;
	threadId: Id<'threads'>;
	parentId?: Id<'messages'>;
	role: 'user' | 'assistant';
	content: string;
	status?: 'in_progress' | 'complete' | 'error';
	modelUsed: string;

	// Future enhancements we could add:
	// finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
	// tokenUsage?: {
	//   promptTokens: number;
	//   completionTokens: number;
	//   totalTokens: number;
	// };
	// responseTime?: number; // milliseconds
	// temperature?: number;
	// maxTokens?: number;
	// toolCalls?: Array<{
	//   id: string;
	//   type: 'function';
	//   function: { name: string; arguments: string; };
	// }>;
	// attachments?: Array<{
	//   id: string;
	//   type: 'image' | 'pdf' | 'text';
	//   url: string;
	//   filename: string;
	// }>;
	// annotations?: Array<{
	//   type: 'citation' | 'code' | 'math';
	//   startIndex: number;
	//   endIndex: number;
	//   data: any;
	// }>;
}

export type Thread = {
	_id: Id<'threads'>;
	_creationTime: number;
	userId: Id<'users'>;
	title: string;
	isPublic: boolean;
	shareId?: string;
	currentModel?: string;
	pinned?: boolean;
	branchedFromMessageId?: Id<'messages'>;
};

export interface User {
	_id: Id<'users'>;
	_creationTime: number;
	name: string;
	email?: string;
	authId: string;
}

// For the optimistic message state
export interface OptimisticMessage {
	role: 'user' | 'assistant';
	content: string;
}
