'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	ExternalLink,
	Key,
	Loader2,
	AlertCircle,
	CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ApiKeyModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Modal for users to input and validate their OpenRouter API key
 */
export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
	const [apiKey, setApiKey] = useState('');
	const [isValidating, setIsValidating] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [isValid, setIsValid] = useState(false);

	const updateApiKey = useMutation(api.users.updateOpenRouterApiKey);

	const validateAndSave = async () => {
		if (!apiKey.trim()) {
			setValidationError('Please enter an API key');
			return;
		}

		setIsValidating(true);
		setValidationError(null);
		setIsValid(false);

		try {
			// Validate the API key
			const response = await fetch('/api/validate-key', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ apiKey: apiKey.trim() }),
			});

			const result = await response.json();

			if (result.valid) {
				// Save the API key to the database
				await updateApiKey({ apiKey: apiKey.trim() });
				setIsValid(true);

				// Close modal after a brief success message
				setTimeout(() => {
					onOpenChange(false);
					setApiKey('');
					setIsValid(false);
				}, 1500);
			} else {
				setValidationError(result.error || 'Invalid API key');
			}
		} catch (error) {
			console.error('Error validating API key:', error);
			setValidationError('Failed to validate API key. Please try again.');
		} finally {
			setIsValidating(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !isValidating) {
			validateAndSave();
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Key className="h-5 w-5" />
						Add OpenRouter API Key
					</DialogTitle>
					<DialogDescription>
						To use this Quriosity, you'll need to provide your own OpenRouter
						API key. This key is stored securely and only used for your chat
						requests.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="api-key">OpenRouter API Key</Label>
						<Input
							id="api-key"
							autoComplete="off"
							aria-autocomplete="none"
							type="password"
							placeholder="sk-or-v1-..."
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							onKeyDown={handleKeyPress}
							disabled={isValidating || isValid}
						/>
					</div>

					{validationError && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{validationError}</AlertDescription>
						</Alert>
					)}

					{isValid && (
						<Alert className="border-green-200 bg-green-50 text-green-800">
							<CheckCircle className="h-4 w-4" />
							<AlertDescription>
								API key validated successfully!
							</AlertDescription>
						</Alert>
					)}

					<div className="text-sm text-muted-foreground space-y-2">
						<p>Don't have an API key?</p>
						<Link
							href="https://openrouter.ai/keys"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1  underline">
							Get your OpenRouter API key
							<ExternalLink className="h-3 w-3" />
						</Link>
					</div>

					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isValidating}>
							Cancel
						</Button>
						<Button
							onClick={validateAndSave}
							disabled={isValidating || isValid || !apiKey.trim()}>
							{isValidating && (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							)}
							{isValid ? 'Saved!' : 'Validate & Save'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
