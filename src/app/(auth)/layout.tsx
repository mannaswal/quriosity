import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { getAuthToken } from '@/server/clerk';
import { api } from 'convex/_generated/api';
import { cookies } from 'next/headers';
import { fetchQuery } from 'convex/nextjs';
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs';
import { redirect } from 'next/navigation';

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// At this point, the middleware and auth completion page have ensured
	// the user is properly authenticated, so we can trust the auth state
	const cookieStore = await cookies();
	const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

	const token = await getAuthToken();

	// If no valid token, redirect to auth page (this shouldn't happen due to middleware, but safety check)
	if (!token) redirect('/auth');

	// Get user data for the sidebar
	// Handle the case where user might not have a user document yet
	let user: any = null;
	let serverThreads: any[] = [];
	let serverProjects: any[] = [];

	try {
		const results = await Promise.all([
			fetchQuery(api.users.getCurrentUser, {}, { token }),
			fetchQuery(api.threads.getUserThreads, {}, { token }),
			fetchQuery(api.projects.getUserProjects, {}, { token }),
		]);

		user = results[0];
		serverThreads = results[1];
		serverProjects = results[2];
	} catch (error) {
		console.log(
			'Layout: Error fetching user data, likely missing user document:',
			error
		);
		// If fetching fails (likely because user doc doesn't exist), use empty defaults
		// The client-side useCurrentUser hook will handle the redirect to /auth/complete
		user = null;
		serverThreads = [];
		serverProjects = [];
	}

	// Additional check: if user is null, provide empty defaults for sidebar
	// The client-side redirect will handle getting the user to /auth/complete
	if (!user) {
		console.log(
			'Layout: User document not found, providing empty sidebar data'
		);
		serverThreads = [];
		serverProjects = [];
	}

	return (
		<SidebarProvider defaultOpen={defaultOpen}>
			<AppSidebar
				userData={user ?? undefined}
				serverThreads={serverThreads ?? []}
				serverProjects={serverProjects ?? []}
			/>
			<main className="flex-1 relative">
				<AppBreadcrumbs />
				{children}
			</main>
		</SidebarProvider>
	);
}
