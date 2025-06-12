import { Redis } from '@upstash/redis';

// Initialize Redis client with Upstash
const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL!,
	token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Redis client instance for direct operations
 */
export { redis };

/**
 * Generate a Redis key for streaming chunks
 * @param messageId - The assistant message ID
 */
function getStreamKey(messageId: string): string {
	return `stream:${messageId}`;
}

/**
 * Add a chunk to the streaming buffer
 * @param messageId - The assistant message ID
 * @param chunk - The text chunk to buffer
 */
export async function addChunkToBuffer(
	messageId: string,
	chunk: string
): Promise<void> {
	try {
		const streamKey = getStreamKey(messageId);
		// Use Redis list to maintain order of chunks
		await redis.rpush(streamKey, chunk);
		// Set expiration to auto-cleanup (2 hours)
		await redis.expire(streamKey, 7200);
	} catch (error) {
		console.error(`Failed to add chunk to buffer for ${messageId}:`, error);
		throw error;
	}
}

/**
 * Get all accumulated chunks for a message (for catch-up)
 * @param messageId - The assistant message ID
 */
export async function getAccumulatedChunks(
	messageId: string
): Promise<string[]> {
	try {
		const streamKey = getStreamKey(messageId);
		const chunks = await redis.lrange(streamKey, 0, -1);
		return Array.isArray(chunks) ? (chunks as string[]) : [];
	} catch (error) {
		console.error(`Failed to get accumulated chunks for ${messageId}:`, error);
		return [];
	}
}

/**
 * Get the complete assembled content from all chunks
 * @param messageId - The assistant message ID
 */
export async function getCompleteContent(messageId: string): Promise<string> {
	try {
		const chunks = await getAccumulatedChunks(messageId);
		return chunks.join('');
	} catch (error) {
		console.error(`Failed to get complete content for ${messageId}:`, error);
		return '';
	}
}

/**
 * Clear the chunk buffer for a message (cleanup after completion)
 * @param messageId - The assistant message ID
 */
export async function clearChunkBuffer(messageId: string): Promise<void> {
	try {
		const streamKey = getStreamKey(messageId);
		await redis.del(streamKey);
	} catch (error) {
		console.error(`Failed to clear chunk buffer for ${messageId}:`, error);
	}
}

/**
 * Mark a stream as completed and schedule cleanup
 * @param messageId - The assistant message ID
 * @param status - The completion status ('complete', 'stopped', 'error')
 */
export async function markStreamComplete(
	messageId: string,
	status: 'complete' | 'stopped' | 'error'
): Promise<void> {
	try {
		const streamKey = getStreamKey(messageId);
		// Add completion marker
		await redis.rpush(
			streamKey,
			JSON.stringify({ type: 'completion', status })
		);
		// Set expiration for cleanup (1 hour)
		await redis.expire(streamKey, 3600);
	} catch (error) {
		console.error(`Failed to mark stream complete for ${messageId}:`, error);
		throw error;
	}
}

/**
 * Check if Redis is available
 */
export async function checkRedisHealth(): Promise<boolean> {
	try {
		await redis.ping();
		return true;
	} catch (error) {
		console.error('Redis health check failed:', error);
		return false;
	}
}
