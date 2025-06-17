import { Doc } from 'convex/_generated/dataModel';

export type Message = Doc<'messages'>;

export type Thread = Doc<'threads'>;

export type User = Doc<'users'>;

export type Attachment = Doc<'attachments'>;

export type Project = Doc<'projects'>;

export type ProjectWithAttachments = Project & {
	attachments: Attachment[];
};

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
