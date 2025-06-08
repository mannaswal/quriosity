'use client';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenuItem,
	SidebarMenu,
	SidebarMenuButton,
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
	const { isAuthenticated, isLoading } = useConvexAuth();
	useStoreUserEffect();
	const threads = useQuery(
		api.threads.getUserThreads,
		isAuthenticated ? {} : 'skip'
	);

	return (
		<Sidebar>
			<SidebarHeader>
				<Link href="/">
					<h1 className="text-2xl font-bold">M3 Chat</h1>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{isLoading ? (
								<div className="text-sm text-muted-foreground">Loading...</div>
							) : isAuthenticated ? (
								threads?.length === 0 ? (
									<div className="text-sm text-muted-foreground">
										No conversations yet
									</div>
								) : (
									threads?.map((thread) => (
										<SidebarMenuItem key={thread._id}>
											<SidebarMenuButton asChild>
												<Link
													href={`/chat/${thread._id}`}
													className="text-sm hover:text-foreground transition-colors">
													{thread.title}
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))
								)
							) : (
								<div className="text-sm text-muted-foreground">
									Sign in to view conversations
								</div>
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
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
