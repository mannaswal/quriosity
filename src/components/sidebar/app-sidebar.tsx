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
	SidebarGroupAction,
} from '@/components/ui/sidebar';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SidebarMenuSub, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { Authenticated, Unauthenticated, useConvexAuth } from 'convex/react';
import { SignInButton, UserButton } from '@clerk/nextjs';
import { useStoreUserEffect } from '@/hooks/use-store-user';
import { useThreads } from '@/hooks/use-threads';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useMemo } from 'react';
import { ThreadItem } from './thread-item';

import { Funnel_Display } from 'next/font/google';
import { cn, groupThreadsByStatusAndRecency } from '@/lib/utils';
import {
	ArchiveIcon,
	ChevronDownIcon,
	EyeIcon,
	EyeOffIcon,
	FolderIcon,
} from 'lucide-react';
import {
	Disclosure,
	DisclosureContent,
	DisclosureTrigger,
} from '../ui/disclosure';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const funnelDisplay = Funnel_Display({
	subsets: ['latin'],
	weight: ['500'],
});

/**
 * AppSidebar component with threads grouped by pinned, today, yesterday, last 7 days, last 30 days.
 */
export function AppSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const threadId = pathname.includes('/chat/')
		? pathname.split('/chat/')[1]
		: null;
	const { isAuthenticated, isLoading } = useConvexAuth();

	useStoreUserEffect();

	const threads = useThreads();

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

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.shiftKey &&
				e.key.toLowerCase() === 'o'
			) {
				e.preventDefault();
				router.push('/');
			}
		};
		window.addEventListener('keydown', handler);
		return () => {
			window.removeEventListener('keydown', handler);
		};
	}, [router]);

	return (
		<Sidebar variant="floating">
			<SidebarHeader className="flex flex-col items-center justify-between pt-1">
				<Link
					href="/"
					className="rounded-lg w-full">
					<h1
						className={cn(
							'text-xl font-medium p-2 tracking-tight text-center',
							funnelDisplay.className
						)}>
						Quriosity
					</h1>
				</Link>
				<div className="w-full space-y-2">
					<Button
						variant="ghost"
						className="w-full dark:bg-input/90 hover:dark:bg-input"
						size="lg"
						asChild>
						<Link href="/">New chat</Link>
					</Button>
					<Button
						variant="ghost"
						className="w-full"
						size="lg"
						asChild>
						<Link
							href="/projects"
							className="flex items-center gap-2">
							<FolderIcon className="size-4" />
							Projects
						</Link>
					</Button>
				</div>
			</SidebarHeader>
			<SidebarContent className="h-full gap-0 ">
				{isLoading ? (
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								<div className="text-sm text-muted-foreground">Loading...</div>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				) : isAuthenticated ? (
					!threads || threads.length === 0 ? (
						<SidebarGroup>
							<SidebarGroupContent>
								<SidebarMenu>
									<div className="text-sm text-muted-foreground">
										No conversations yet
									</div>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					) : (
						<>
							{sidebarGroups.map((group) => {
								if (group.threads.length === 0 || group.name === 'Archived')
									return null;
								return (
									<SidebarGroup key={group.name}>
										<SidebarGroupLabel>{group.name}</SidebarGroupLabel>
										<SidebarGroupContent>
											<SidebarMenu>
												{group.threads.map((thread) => (
													<ThreadItem
														key={thread._id}
														thread={thread}
														currentThreadId={threadId}
													/>
												))}
											</SidebarMenu>
										</SidebarGroupContent>
									</SidebarGroup>
								);
							})}
							{groupedThreads.archived.length > 0 && (
								<Disclosure className="group/collapsible mt-auto">
									<SidebarGroup>
										<SidebarGroupLabel>
											Archived
											<Badge
												variant="secondary"
												className="ml-2 text-[10px] text-muted-foreground py-px">
												{groupedThreads.archived.length}
											</Badge>
										</SidebarGroupLabel>
										<DisclosureTrigger>
											<SidebarGroupAction
												title="Archived"
												className="group/archived">
												<EyeOffIcon className="size-3! hidden group-aria-expanded/archived:block transition-opacity text-muted-foreground" />
												<EyeIcon className="size-3! block group-aria-expanded/archived:hidden transition-opacity text-muted-foreground" />
												<span className="sr-only">Archived</span>
											</SidebarGroupAction>
										</DisclosureTrigger>
										<DisclosureContent>
											<SidebarGroupContent>
												<SidebarMenu>
													{groupedThreads.archived?.map((thread) => (
														<ThreadItem
															key={thread._id}
															thread={thread}
															currentThreadId={threadId}
														/>
													))}
												</SidebarMenu>
											</SidebarGroupContent>
										</DisclosureContent>
									</SidebarGroup>
								</Disclosure>
							)}
						</>
					)
				) : (
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								<div className="text-sm text-muted-foreground">
									Sign in to view conversations
								</div>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}
			</SidebarContent>
			<SidebarFooter>
				<Authenticated>
					<UserButton />
				</Authenticated>
				<Unauthenticated>
					<SignInButton />
				</Unauthenticated>
			</SidebarFooter>
		</Sidebar>
	);
}
