import { Message } from '@/lib/types';
import { api } from 'convex/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';
import { useMemo } from 'react';

export const useAttachments = () => {
	const { isAuthenticated } = useConvexAuth();

	const attachments = useQuery(
		api.attachments.getUserAttachments,
		isAuthenticated ? {} : 'skip'
	);

	return {
		attachments,
	};
};

export const useMessageAttachments = (message: Message) => {
	const { attachments: allAttachments } = useAttachments();

	const hasAttachments = !!message.attachmentIds?.length;

	const messageAttachments = useMemo(() => {
		if (!hasAttachments) return [];
		const attachments = message.attachmentIds
			?.map((id) => allAttachments?.find((a) => a._id === id))
			.filter(Boolean)
			.filter((a) => a !== undefined);
		return attachments ?? [];
	}, [message.attachmentIds, allAttachments, hasAttachments]);

	return messageAttachments;
};
