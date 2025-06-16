import { Doc } from 'convex/_generated/dataModel';

export type Message = Doc<'messages'>;

export type Thread = Doc<'threads'>;

export type User = Doc<'users'>;

export type ReasoningEffort = 'low' | 'medium' | 'high';
