'use client';

import { useUser } from '@clerk/nextjs';
import { useConvexAuth, useMutation as useConvexMutation } from 'convex/react';
import { useEffect, useState } from 'react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { toast } from 'sonner';
import {
	categorizeConvexError,
	getToastErrorMessage,
} from '@/lib/error-handling';

/**
 * Enhanced hook for manually storing user with proper error handling
 * Returns a function that can be called to store the user with error handling
 */
export function useStoreUser() {
	const storeUserMutation = useConvexMutation(api.users.storeUser);

	return async () => {
		try {
			const userId = await storeUserMutation();
			console.log('User stored successfully:', userId);
			return userId;
		} catch (error) {
			const errorType = categorizeConvexError(error as Error);
			const errorMessage = getToastErrorMessage(
				errorType,
				'user',
				'create account'
			);

			// Show user-friendly error message
			toast.error(errorMessage);

			// Log detailed error for debugging
			console.error('Failed to store user:', error);

			throw error;
		}
	};
}
