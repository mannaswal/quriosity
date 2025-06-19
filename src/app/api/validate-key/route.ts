import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates an OpenRouter API key by making a test request
 */
export async function POST(request: NextRequest) {
	try {
		const { apiKey } = await request.json();

		if (!apiKey) {
			return NextResponse.json(
				{ valid: false, error: 'API key is required' },
				{ status: 400 }
			);
		}

		try {
			// Make a minimal test request to validate the key
			const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				return NextResponse.json({ valid: true });
			} else {
				const errorData = await response.json().catch(() => ({}));
				return NextResponse.json({
					valid: false,
					error: errorData.error?.message || 'Invalid API key',
				});
			}
		} catch (error) {
			console.error('API key validation error:', error);
			return NextResponse.json({
				valid: false,
				error: 'Failed to validate API key',
			});
		}
	} catch (error) {
		console.error('Error validating API key:', error);
		return NextResponse.json(
			{ valid: false, error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
