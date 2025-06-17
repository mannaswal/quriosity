export async function fetchTextFromUrl(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'ChatApp/1.0',
		},
		// Add timeout
		signal: AbortSignal.timeout(10000), // 10 second timeout
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch file: ${response.status}`);
	}

	// Check content type
	const contentType = response.headers.get('content-type');
	if (!contentType?.startsWith('text/')) {
		throw new Error('URL does not point to a text file');
	}

	// Check file size (prevent huge files)
	const contentLength = response.headers.get('content-length');
	if (contentLength && parseInt(contentLength) > 1024 * 1024) {
		// 1MB limit
		throw new Error('File too large');
	}

	const text = await response.text();
	return text;
}
