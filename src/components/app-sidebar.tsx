'use client';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
	SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';
import {
	Authenticated,
	Unauthenticated,
	useConvexAuth,
	useQuery,
} from 'convex/react';
import { SignInButton, UserButton } from '@clerk/nextjs';
import { useStoreUserEffect } from '@/hooks/use-store-user';
import { api } from '../../convex/_generated/api';
import Link from 'next/link';

export function AppSidebar() {
	const { isAuthenticated } = useStoreUserEffect();
	const threads = useQuery(api.threads.getUserThreads);

	return (
		<Sidebar>
			<SidebarHeader>
				<Link href="/">
					<h1 className="text-2xl font-bold">M3 Chat</h1>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Threads</SidebarGroupLabel>
					<SidebarGroupContent className="flex flex-col gap-2">
						{threads?.map((thread) => (
							<Link
								key={thread._id}
								href={`/chat/${thread._id}`}>
								{thread.title}
							</Link>
						))}
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				{isAuthenticated && <>hi</>}
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
