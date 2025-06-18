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
import { Authenticated, Unauthenticated } from 'convex/react';
import {
	SignInButton,
	SignOutButton,
	useClerk,
	UserButton,
	useUser,
} from '@clerk/nextjs';
import { useStoreUserEffect } from '@/hooks/use-store-user';
import { useThreadId } from '@/hooks/use-threads';
import Link from 'next/link';

import { useEffect, useMemo } from 'react';
import { SidebarThreadItem } from '../threads/sidebar-thread-item';

import { Funnel_Display } from 'next/font/google';
import { cn, groupThreadsByStatusAndRecency } from '@/lib/utils';
import { FolderIcon, LogOutIcon } from 'lucide-react';
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

const funnelDisplay = Funnel_Display({
	subsets: ['latin'],
	weight: ['500'],
});

/**
 * AppSidebar component with threads grouped by pinned, today, yesterday, last 7 days, last 30 days.
 */
export function AppSidebar({
	userData,
	serverThreads: threads,
	serverProjects: projects,
}: {
	userData: User | undefined;
	serverThreads: Thread[];
	serverProjects: Project[];
}) {
	const router = useRouter();
	useStoreUserEffect();

	const { signOut, user } = useClerk();

	const threadId = useThreadId();

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
	}, []);

	const handleSignOut = async () => {
		await signOut();
		router.push('/');
	};

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
		<Sidebar variant="sidebar">
			<SidebarHeader className="flex flex-col items-center justify-between relative">
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
				<SidebarTrigger className="absolute top-4.5 left-4.5" />
				<div className="w-full space-y-2">
					<Button
						variant="ghost"
						className="w-full dark:bg-input/90 hover:dark:bg-input"
						size="lg"
						asChild>
						<Link href="/">New chat</Link>
					</Button>
				</div>
				<div className="h-6 absolute bottom-0 left-0 translate-y-full w-full bg-gradient-to-b from-[#141414] to-transparent z-50 pointer-events-none" />
			</SidebarHeader>

			<SidebarContent className="h-full gap-0 scrollbar-hide relative">
				{!threads || threads.length === 0 ? (
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								<div className="text-sm text-muted-foreground text-center">
									No conversations yet
								</div>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				) : (
					<>
						{projects && projects.length > 0 && (
							<SidebarGroup>
								<SidebarGroupLabel>Projects</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{projects.slice(0, 5).map((project) => (
											<SidebarMenuItem key={project._id}>
												<SidebarMenuButton asChild>
													<Link href={`/projects/${project._id}`}>
														<FolderIcon className="size-3.5!" />
														{project.name}
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						)}
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
						{groupedThreads.archived.length > 0 && (
							<Disclosure className="group/collapsible sticky bottom-0 left-0 right-0 bg-[#141414] z-10">
								<div className="h-6 absolute top-0 left-0 -translate-y-full w-full bg-gradient-to-t from-[#141414] to-transparent z-20 pointer-events-none" />

								<SidebarGroup className="pt-1 pb-0">
									<DisclosureTrigger>
										<SidebarGroupLabel asChild>
											<Button
												size="sm"
												variant="ghost"
												className="w-full text-xs justify-start text-sidebar-foreground/70">
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
					</>
				)}
			</SidebarContent>
			<SidebarFooter>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="w-full justify-start h-12">
							<Avatar>
								<AvatarImage src={user?.imageUrl} />
								<AvatarFallback>
									{user?.fullName?.charAt(0) ?? userData?.name?.charAt(0)}
								</AvatarFallback>
							</Avatar>
							<span className="ml-2">{user?.fullName ?? userData?.name}</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						side="right"
						className="min-w-48">
						<SignOutButton>
							<Button
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
