'use client';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { useConvexAuth } from 'convex/react';
import { useAuth0 } from '@auth0/auth0-react';

export function AppSidebar() {
	const { isAuthenticated } = useConvexAuth();
	const { user, loginWithRedirect, logout } = useAuth0();
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
				{user?.name}
				{isAuthenticated ? (
					<Button onClick={() => logout()}>Log out</Button>
				) : (
					<Button onClick={() => loginWithRedirect()}>Log in</Button>
				)}
			</SidebarFooter>
		</Sidebar>
	);
}
