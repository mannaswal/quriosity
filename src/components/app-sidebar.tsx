'use client';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { Authenticated, Unauthenticated, useConvexAuth } from 'convex/react';
import { SignInButton, UserButton } from '@clerk/nextjs';

export function AppSidebar() {
	const { isAuthenticated } = useConvexAuth();

	return (
		<Sidebar>
			<SidebarHeader>
				<h1 className="text-2xl font-bold">M3 Chat</h1>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup />
				<SidebarGroup />
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
