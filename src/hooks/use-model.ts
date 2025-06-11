import { ModelId } from '@/lib/models';
import { useThreadId, useThreads } from './use-threads';
import { useCurrentUser } from './use-user';

export function useModel() {
	const threads = useThreads();
	const threadId = useThreadId();
	const user = useCurrentUser();

	if (threadId) {
		const thread = threads?.find((t) => t._id === threadId);
		return thread?.currentModel as ModelId;
	}

	if (user) {
		return user.lastModelUsed as ModelId;
	}

	return 'google/gemini-2.0-flash-001';
}
