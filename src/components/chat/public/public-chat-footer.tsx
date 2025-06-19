import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

/**
 * Footer component for public shared chats
 */
export function PublicChatFooter() {
	return (
		<div className="w-full z-[6] p-6 pb-8">
			<div className="max-w-4xl mx-auto">
				<div className="text-center space-y-3">
					<p className="text-sm text-muted-foreground">
						This is a shared conversation from Quriosity
					</p>
					<Button
						variant="secondary"
						className="bg-input/50 backdrop-blur-sm"
						asChild>
						<Link
							href="/"
							className="inline-flex items-center gap-2">
							Start your own conversation
							<ArrowRight className="size-4" />
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
