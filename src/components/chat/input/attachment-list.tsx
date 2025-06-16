import {
	useTempActions,
	useTempAttachments,
} from '@/stores/use-temp-data-store';
import { Fragment, useMemo } from 'react';
import Image from 'next/image';
import { Message, TempAttachment } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { FileImage, FileText, FileType, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAttachments, useMessageAttachments } from '@/hooks/use-attachments';

export function InputAttachmentList() {
	const attachments = useTempAttachments();

	if (!attachments.length) return null;

	return (
		<div className="w-fit max-w-full flex items-center gap-2 mb-2 relative p-1.5 bg-neutral-900/90 backdrop-blur rounded-2xl border-[0.5px] border-border">
			<div className="flex items-center gap-1.5 w-fit overflow-x-scroll scrollbar-hide relative rounded-lg">
				{attachments.map((attachment) => (
					<Fragment key={attachment.name}>
						{attachment.type === 'image' ? (
							<ImageItem attachment={attachment} />
						) : (
							<FileNameItem attachment={attachment} />
						)}
					</Fragment>
				))}
			</div>
		</div>
	);
}

const ImageItem = ({ attachment }: { attachment: TempAttachment }) => {
	const { removeAttachment } = useTempActions();
	return (
		<div className="group relative">
			<div className="size-12 grow-0 shrink-0  flex items-center justify-center overflow-hidden rounded-lg bg-neutral-600/20 relative">
				{attachment.uploaded ? (
					<Image
						src={attachment.url}
						alt={attachment.name}
						fill
						sizes="96px"
						className="object-cover"
					/>
				) : (
					<Loader
						variant="classic"
						size="sm"
						className="scale-90 -mt-1 -ml-px"
					/>
				)}
			</div>
			<Button
				variant="secondary"
				size="icon"
				className="absolute top-0 right-0 m-px opacity-0 group-hover:opacity-100 duration-200 z-10 size-5 hover:bg-neutral-700 transition-[colors, opacity]"
				onClick={() => removeAttachment(attachment.name)}>
				<X className="size-2.5" />
			</Button>
		</div>
	);
};

const FileNameItem = ({ attachment }: { attachment: TempAttachment }) => {
	const { removeAttachment } = useTempActions();

	const getIcon = () => {
		if (!attachment.uploaded) {
			return (
				<Loader
					variant="classic"
					size="sm"
					className="scale-90 -mt-0.5 -ml-px"
				/>
			);
		}
		if (attachment.type === 'pdf') {
			return <FileText className="size-4 shrink-0" />;
		}
		if (attachment.type === 'image') {
			return <FileImage className="size-4 shrink-0" />;
		}
		return <FileType className="size-4 shrink-0" />;
	};

	return (
		<div className="group relative">
			<div
				className={cn(
					'flex items-center gap-2 px-3 rounded-lg h-12 bg-neutral-600/20'
				)}>
				<div className="size-4 shrink-0">{getIcon()}</div>
				<span className="whitespace-nowrap text-sm max-w-32 truncate">
					{attachment.name}
				</span>
			</div>
			<Button
				variant="secondary"
				size="icon"
				className="absolute top-0 right-0 m-px opacity-0 group-hover:opacity-100 duration-200 z-10 size-5 hover:bg-neutral-700 transition-[colors, opacity]"
				onClick={() => removeAttachment(attachment.name)}>
				<X className="size-2.5" />
			</Button>
		</div>
	);
};

export function MessageAttachmentList({ message }: { message: Message }) {
	const messageAttachments = useMessageAttachments(message);

	if (!messageAttachments.length) return null;

	return (
		<div className="peer flex flex-wrap gap-2 pt-2 w-full justify-end">
			{messageAttachments.map((attachment) => {
				if (!attachment) return null;

				if (attachment.type === 'image')
					return (
						<div
							key={attachment._id}
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
							key={attachment._id}
							className={cn(
								'flex items-center gap-2 px-3.5 rounded-md  first:rounded-l-2xl last:rounded-br-2xl h-12 bg-neutral-600/20'
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
