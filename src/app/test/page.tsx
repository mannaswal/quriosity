'use client';

import { useLocalStorage } from '@uidotdev/usehooks';
import { useTempModel } from '@/stores/use-temp-data-store';

export default function TestPage() {
	const [model, setModel] = useLocalStorage('model', 'test');
	const tempModel = useTempModel();

	return (
		<div>
			<h1>Test Page</h1>
			<p>{model}</p>
			<button onClick={() => setModel('test2')}>Set Model</button>
			<p>{tempModel}</p>
		</div>
	);
}
