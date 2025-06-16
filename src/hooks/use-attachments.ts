import { useAuth } from '@clerk/nextjs';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { useConvexAuth, useQuery } from 'convex/react';

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
