import { Doc, Id } from 'convex/_generated/dataModel';

export type Message = Doc<'messages'>;
export type MessageId = Id<'messages'>;

export type Thread = Doc<'threads'>;
export type ThreadId = Id<'threads'>;

export type User = Doc<'users'>;
export type UserId = Id<'users'>;

export type Attachment = Doc<'attachments'>;
export type AttachmentId = Id<'attachments'>;

export type Project = Doc<'projects'>;
export type ProjectId = Id<'projects'>;

export type ProjectWithAttachments = Project & {
	attachments: Attachment[];
};

export type ProjectData = ProjectWithAttachments;

export type ReasoningEffort = 'low' | 'medium' | 'high';

export type AttachmentType = 'text' | 'image' | 'pdf';

export type TempAttachment =
	| {
			uploaded: false; // When not yet fully uploaded
			fingerprint: string; // Unique identifier for matching (name + size + lastModified)
			name: string; // Filename from upload (always available even if not uploaded)
			type: AttachmentType; // Optional if not uploaded
			mimeType?: string; // Optional if not uploaded
			url?: string; // Optional if not uploaded
			uploadThingKey?: string; // Optional if not uploaded
			textContent?: string; // For text files
	  }
	| {
			uploaded: true; // When fully uploaded
			fingerprint: string; // Unique identifier for matching
			name: string; // Filename from upload (mandatory)
			url: string; // UploadThing URL (mandatory)
			mimeType: string; // Mandatory
			type: AttachmentType; // Mandatory
			uploadThingKey: string; // For deletion if needed (mandatory)
			textContent?: string; // For text files
	  };

// Public/Shared thread and message types (sanitized for sharing)
export type PublicAttachment = {
	filename: string;
	url: string;
	mimeType: string;
	type: AttachmentType;
};

export type PublicThread = {
	_id: ThreadId;
	_creationTime: number;
	title: string;
	shareId: string;
	model: string;
	reasoningEffort?: ReasoningEffort;
	status: 'pending' | 'streaming' | 'done' | 'error';
};

export type PublicMessage = {
	_id: MessageId;
	_creationTime: number;
	threadId: ThreadId;
	content: string;
	reasoning?: string;
	role: 'user' | 'assistant' | 'system';
	status: 'pending' | 'streaming' | 'done' | 'error' | 'reasoning';
	stopReason?: 'completed' | 'stopped' | 'error';
	model: string;
	reasoningEffort?: ReasoningEffort;
	useWebSearch?: boolean;
	attachments: PublicAttachment[]; // Converted from attachment IDs
};
