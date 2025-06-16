import { Doc } from 'convex/_generated/dataModel';

export type Message = Doc<'messages'>;

export type Thread = Doc<'threads'>;

export type User = Doc<'users'>;

export type Attachment = Doc<'attachments'>;

export type ReasoningEffort = 'low' | 'medium' | 'high';

export type AttachmentType = 'text' | 'image' | 'pdf';
