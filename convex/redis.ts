import { Redis } from '@upstash/redis';

// Initialize Redis client with Upstash
const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL!,
	token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Generate a Redis key for a stream stop flag
 * @param messageId - The assistant message ID
 */
function getStopFlagKey(messageId: string): string {
	return `stop-flag:${messageId}`;
}

/**
 * Set a stop flag for a stream in Redis.
 * This signals the streaming server to gracefully stop.
 * @param messageId - The assistant message ID
 */
export async function setStreamStopFlag(messageId: string): Promise<void> {
	try {
		const stopFlagKey = getStopFlagKey(messageId);
		// Set the flag with a value of '1' and an expiration of 1 hour
		await redis.set(stopFlagKey, '1', { ex: 3600 });
	} catch (error) {
		console.error(`Failed to set stop flag for ${messageId}:`, error);
		throw error;
	}
}
