import Image from 'next/image';
import { PublicMessage } from '@/lib/types';
import { FileText, FileType } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicMessageAttachmentListProps {
	message: PublicMessage;
}

/**
 * Read-only attachment list for public shared messages
 * Displays attachments without interactive features
 */
export function PublicMessageAttachmentList({
	message,
}: PublicMessageAttachmentListProps) {
	if (!message.attachments || message.attachments.length === 0) return null;

	return (
		<div className="peer flex flex-wrap gap-2 pt-2 w-full justify-end">
			{message.attachments.map((attachment) => {
				if (attachment.type === 'image')
					return (
						<div
							key={attachment.url}
							className="h-48 rounded-md last:rounded-tr-md last:rounded-br-2xl first:rounded-l-2xl overflow-hidden flex-shrink-0 bg-neutral-600/20 max-w-full">
							<Image
								src={attachment.url}
								alt={attachment.filename}
								width={0}
								height={0}
								sizes="(max-width: 600px) 100vw, 600px"
								unoptimized={attachment.mimeType.includes('gif')}
								className="h-full w-auto object-cover"
								style={{ width: 'auto', height: '100%' }}
							/>
						</div>
					);
				else
					return (
						<div
							key={attachment.url}
							className={cn(
								'flex items-center gap-2 px-3.5 rounded-md first:rounded-l-2xl last:rounded-br-2xl h-12 bg-neutral-600/20'
							)}>
							<div className="size-4 shrink-0">
								{attachment.type === 'pdf' ? (
									<FileText
										className="size-4 shrink-0"
										strokeWidth={1.5}
									/>
								) : (
									<FileType
										className="size-4 shrink-0"
										strokeWidth={1.5}
									/>
								)}
							</div>
							<span className="whitespace-nowrap text-sm max-w-64 truncate">
								{attachment.filename}
							</span>
						</div>
					);
			})}
		</div>
	);
}
