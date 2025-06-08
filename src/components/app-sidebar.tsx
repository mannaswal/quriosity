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
import { Authenticated, Unauthenticated, useConvexAuth } from 'convex/react';
import { SignInButton, UserButton } from '@clerk/nextjs';
import { useStoreUserEffect } from '@/hooks/use-store-user';

export function AppSidebar() {
	const { isAuthenticated } = useStoreUserEffect();

	return (
		<Sidebar>
			<SidebarHeader>
				<h1 className="text-2xl font-bold">M3 Chat</h1>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Threads</SidebarGroupLabel>
					<SidebarGroupContent></SidebarGroupContent>
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
