'use client';

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarTrigger,
} from '@/components/ui/sidebar';
import { SignOutButton, useClerk } from '@clerk/nextjs';

import { useThreadId } from '@/hooks/use-threads';
import Link from 'next/link';

import { useEffect, useMemo } from 'react';
import { SidebarThreadItem } from '../threads/sidebar-thread-item';
import { useThreadSearch } from '@/hooks/use-thread-search';
import { SearchResults } from '../threads/search-results';

import { Funnel_Display } from 'next/font/google';
import { cn, groupThreadsByStatusAndRecency } from '@/lib/utils';
import {
	ArchiveIcon,
	FolderIcon,
	LogOutIcon,
	SearchIcon,
	X,
} from 'lucide-react';
import {
	Disclosure,
	DisclosureContent,
	DisclosureTrigger,
} from '../ui/disclosure';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Thread, User } from '@/lib/types';
import { Project } from '@/lib/types';
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Input } from '../ui/input';
import { TooltipWrapper } from '../ui/tooltip-wrapper';
import { useTempActions } from '@/stores/use-temp-data-store';

const funnelDisplay = Funnel_Display({
	subsets: ['latin'],
	weight: ['500'],
});

/**
 * AppSidebar component with threads grouped by pinned, today, yesterday, last 7 days, last 30 days.
 */
export function AppSidebar({
	userData,
	serverThreads,
	serverProjects,
}: {
	userData: User | undefined;
	serverThreads: Thread[];
	serverProjects: Project[];
}) {
	const router = useRouter();

	const { user } = useClerk();
	const { isAuthenticated } = useConvexAuth();

	const threadId = useThreadId();
	const clientThreads = useQuery(
		api.threads.getUserThreads,
		isAuthenticated ? {} : 'skip'
	);
	const clientProjects = useQuery(
		api.projects.getUserProjects,
		isAuthenticated ? {} : 'skip'
	);

	// Search functionality
	const {
		searchQuery,
		setSearchQuery,
		isSearchActive,
		searchResults,
		isSearching,
		hasSearched,
		clearSearch,
	} = useThreadSearch();

	const threads = clientThreads ?? serverThreads;
	const projects = clientProjects ?? serverProjects;

	const { clearAll } = useTempActions();

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				(event.metaKey || event.ctrlKey) &&
				event.shiftKey &&
				(event.key === 'o' || event.key === 'O')
			) {
				event.preventDefault();
				router.push('/');
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	const groupedThreads = useMemo(() => {
		return groupThreadsByStatusAndRecency(threads);
	}, [threads]);

	const sidebarGroups = [
		{ name: 'Pinned', threads: groupedThreads.pinned },
		{ name: 'Today', threads: groupedThreads.today },
		{ name: 'Yesterday', threads: groupedThreads.yesterday },
		{ name: 'Last 7 Days', threads: groupedThreads.last7Days },
		{ name: 'Last 30 Days', threads: groupedThreads.last30Days },
		{ name: 'Archived', threads: groupedThreads.archived },
	];

	return (
		<Sidebar>
			<SidebarHeader className="flex flex-col items-center justify-between relative">
				<Link
					href="/"
					className="rounded-lg">
					<h1
						className={cn(
							'text-xl font-medium p-2 tracking-tight text-center',
							funnelDisplay.className
						)}>
						Quriosity
					</h1>
				</Link>
				<div className="relative w-full">
					<TooltipWrapper
						side="bottom"
						tooltip={
							isSearching || isSearching || searchQuery
								? undefined
								: threads?.length
								? 'Search chats by messages'
								: "You don't have any chats yet"
						}>
						<Input
							placeholder="Search chats"
							id="search-chats"
							autoComplete="off"
							aria-autocomplete="none"
							className="w-full border-none"
							disabled={!threads?.length}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</TooltipWrapper>
					<Button
						variant="ghost"
						size="sm"
						disabled={!isSearchActive}
						className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:dark:bg-accent"
						onClick={clearSearch}>
						{isSearchActive ? (
							<X className="h-3 w-3" />
						) : (
							<SearchIcon className="h-3 w-3" />
						)}
					</Button>
				</div>
				<div className="h-3 absolute bottom-0 left-0 translate-y-full w-full bg-gradient-to-b from-[#141414] to-transparent z-50 pointer-events-none" />
			</SidebarHeader>

			<SidebarContent className="h-full gap-0 scrollbar-hide relative">
				{isSearchActive ? (
					// Show search results when search is active
					isSearching ? (
						<SidebarGroup>
							<SidebarGroupContent>
								<div className="text-sm text-muted-foreground text-center pt-6">
									Searching...
								</div>
							</SidebarGroupContent>
						</SidebarGroup>
					) : hasSearched ? (
						<SearchResults
							searchResults={searchResults || []}
							searchQuery={searchQuery}
							activeThreadId={threadId}
						/>
					) : (
						<SidebarGroup>
							<SidebarGroupContent>
								<div className="text-sm text-muted-foreground text-center pt-6">
									Type to search conversations...
								</div>
							</SidebarGroupContent>
						</SidebarGroup>
					)
				) : !threads ||
				  threads.length === 0 ||
				  threads.length === groupedThreads.archived.length ? (
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								<div className="text-sm text-muted-foreground text-center pt-6">
									No conversations yet
								</div>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				) : (
					<>
						<SidebarGroup>
							<Button
								variant="ghost"
								size={'sm'}
								className="w-full justify-start px-0"
								asChild>
								<Link href="/projects">
									<SidebarGroupLabel className="gap-1.5">
										<FolderIcon
											className="size-3!"
											strokeWidth={1}
										/>
										Projects
									</SidebarGroupLabel>
								</Link>
							</Button>
							{projects && projects.length > 0 && !isSearchActive && (
								<SidebarGroupContent>
									<SidebarMenu>
										{projects.slice(0, 5).map((project) => (
											<SidebarMenuItem key={project._id}>
												<SidebarMenuButton asChild>
													<Link href={`/projects/${project._id}`}>
														{project.name}
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							)}
						</SidebarGroup>
						{sidebarGroups.map((group) => {
							if (group.threads.length === 0 || group.name === 'Archived')
								return null;
							return (
								<SidebarGroup key={group.name}>
									<SidebarGroupLabel>{group.name}</SidebarGroupLabel>
									<SidebarGroupContent>
										<SidebarMenu>
											{group.threads.map((thread) => (
												<SidebarThreadItem
													key={thread._id}
													thread={thread}
													activeThreadId={threadId}
												/>
											))}
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>
							);
						})}
					</>
				)}
				{groupedThreads.archived.length > 0 && (
					<Disclosure className="group/collapsible sticky -bottom-px left-0 right-0 bg-[#141414] z-10 pb-px mt-auto">
						<div className="h-6 absolute top-0 left-0 -translate-y-full w-full bg-gradient-to-t from-[#141414] to-transparent z-20 pointer-events-none" />
						<SidebarGroup className="pt-1 pb-0">
							<DisclosureTrigger>
								<SidebarGroupLabel asChild>
									<Button
										size="sm"
										variant="ghost"
										className="w-full text-xs justify-start text-sidebar-foreground/70">
										<ArchiveIcon
											className="size-3!"
											strokeWidth={1}
										/>
										Archived
										<Badge
											variant="secondary"
											className="ml-auto text-[10px] text-muted-foreground py-px">
											{groupedThreads.archived.length}
										</Badge>
									</Button>
								</SidebarGroupLabel>
							</DisclosureTrigger>
							<DisclosureContent>
								<SidebarGroupContent className="scrollbar-hide">
									<SidebarMenu>
										{groupedThreads.archived?.map((thread) => (
											<SidebarThreadItem
												key={thread._id}
												thread={thread}
												activeThreadId={threadId}
											/>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</DisclosureContent>
						</SidebarGroup>
					</Disclosure>
				)}
			</SidebarContent>
			<SidebarFooter>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="w-full justify-start h-12 pl-2.5">
							<Avatar className="size-7">
								<AvatarImage src={user?.imageUrl} />
								<AvatarFallback>
									{user?.fullName?.charAt(0) ??
										userData?.name?.charAt(0) ??
										userData?.email?.charAt(0) ??
										'A'}
								</AvatarFallback>
							</Avatar>
							<span className="ml-2 font-medium font-theme">
								{user?.fullName ??
									userData?.name ??
									userData?.email ??
									'Anonymous'}
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						side="right"
						className="min-w-48">
						<SignOutButton
							signOutOptions={{
								redirectUrl: '/auth',
							}}>
							<Button
								onClick={() => {
									clearAll();
									router.push('/auth');
								}}
								variant="ghost"
								className="w-full justify-start"
								asChild>
								<DropdownMenuItem>
									<LogOutIcon className="size-3.5! mr-2" />
									Sign out
								</DropdownMenuItem>
							</Button>
						</SignOutButton>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
