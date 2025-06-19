import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { SidebarThreadItem } from './sidebar-thread-item';
import type { Thread, ThreadId } from '@/lib/types';

interface SearchResultWithMatches extends Thread {
	matchingMessages: Array<{
		_id: string;
		content: string;
		role: 'user' | 'assistant' | 'system';
	}>;
	totalMatches: number;
}

interface SearchResultsProps {
	searchResults: SearchResultWithMatches[];
	searchQuery: string;
	activeThreadId?: ThreadId;
}

/**
 * Component for displaying search results in the sidebar
 * Shows threads that contain matching messages
 */
export function SearchResults({
	searchResults,
	searchQuery,
	activeThreadId,
}: SearchResultsProps) {
	if (!searchResults || searchResults.length === 0) {
		return (
			<SidebarGroup>
				<SidebarGroupContent>
					<div className="text-sm text-muted-foreground text-center pt-6">
						No results found for "{searchQuery}"
					</div>
				</SidebarGroupContent>
			</SidebarGroup>
		);
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel>
				Search Results
				<Badge
					variant="secondary"
					className="ml-auto text-[10px]">
					{searchResults.length}
				</Badge>
			</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{searchResults.map((result) => (
						<SidebarThreadItem
							key={result._id}
							thread={result}
							activeThreadId={activeThreadId}
						/>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
