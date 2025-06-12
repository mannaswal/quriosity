export const getStreamConfig = (
	threadId: string,
	assistantMessageId: string,
	model: string
) => {
	console.log('generating stream config');

	return {
		streamUrl: '/api/chat',
		resumeUrl: '/api/chat/resume',
		payload: {
			threadId,
			assistantMessageId,
			model,
		},
		sessionId: crypto.randomUUID(), // Generate unique session ID
	};
};
