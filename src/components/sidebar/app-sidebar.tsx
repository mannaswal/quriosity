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
} from '@/components/ui/sidebar';
import { Authenticated, Unauthenticated, useConvexAuth } from 'convex/react';
import { SignInButton, UserButton } from '@clerk/nextjs';
import { useStoreUserEffect } from '@/hooks/use-store-user';
import { useThreads } from '@/hooks/use-threads';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Thread } from '@/lib/types';

import { useMemo } from 'react';
import { ThreadItem } from './thread-item';

import { Funnel_Display } from 'next/font/google';
import { cn } from '@/lib/utils';

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
		return groupThreadsByRecency(threads);
	}, [threads]);

	const sidebarGroups = [
		{ name: 'Pinned', threads: groupedThreads.pinned },
		{ name: 'Today', threads: groupedThreads.today },
		{ name: 'Yesterday', threads: groupedThreads.yesterday },
		{ name: 'Last 7 Days', threads: groupedThreads.last7Days },
		{ name: 'Last 30 Days', threads: groupedThreads.last30Days },
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
			<SidebarHeader>
				<Link
					href="/"
					className="rounded-lg">
					<h1
						className={cn(
							'text-2xl font-medium p-2 tracking-tight text-center',
							funnelDisplay.className
						)}>
						Quriosity
					</h1>
				</Link>
			</SidebarHeader>
			<SidebarContent>
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
								if (group.threads.length === 0) return null;
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

/**
 * Helper function to group threads by pinned status and recency.
 * Returns an object with keys: pinned, today, yesterday, last7Days, last30Days.
 */
function groupThreadsByRecency(threads: Thread[] | undefined) {
	if (!threads)
		return {
			pinned: [],
			today: [],
			yesterday: [],
			last7Days: [],
			last30Days: [],
		};

	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate()
	);

	const startOfYesterday = new Date(startOfToday);
	startOfYesterday.setDate(startOfToday.getDate() - 1);
	const startOf7DaysAgo = new Date(startOfToday);
	startOf7DaysAgo.setDate(startOfToday.getDate() - 6); // includes today
	const startOf30DaysAgo = new Date(startOfToday);
	startOf30DaysAgo.setDate(startOfToday.getDate() - 29); // includes today

	const groups = {
		pinned: [] as Thread[],
		today: [] as Thread[],
		yesterday: [] as Thread[],
		last7Days: [] as Thread[],
		last30Days: [] as Thread[],
	};

	for (const thread of threads) {
		if (thread.pinned) {
			groups.pinned.push(thread);
			continue;
		}
		const createdAt = new Date(thread._creationTime);

		if (createdAt >= startOfToday) {
			groups.today.push(thread);
		} else if (createdAt >= startOfYesterday && createdAt < startOfToday) {
			groups.yesterday.push(thread);
		} else if (createdAt >= startOf7DaysAgo && createdAt < startOfYesterday) {
			groups.last7Days.push(thread);
		} else if (createdAt >= startOf30DaysAgo && createdAt < startOf7DaysAgo) {
			groups.last30Days.push(thread);
		}
	}
	return groups;
}
