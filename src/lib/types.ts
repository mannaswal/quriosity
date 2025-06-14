import { Doc } from 'convex/_generated/dataModel';

export type Message = Doc<'messages'>;

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

export type Thread = Doc<'threads'>;

export type User = Doc<'users'>;

export type ModelReasoningOptions =
	| {
			effort: 'low' | 'medium' | 'high';
	  }
	| {
			max_tokens: number;
	  };
