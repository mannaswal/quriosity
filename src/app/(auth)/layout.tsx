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
	const [user, serverThreads, serverProjects] = await Promise.all([
		fetchQuery(api.users.getCurrentUser, {}, { token }),
		fetchQuery(api.threads.getUserThreads, {}, { token }),
		fetchQuery(api.projects.getUserProjects, {}, { token }),
	]);

	return (
		<SidebarProvider defaultOpen={defaultOpen}>
			<AppSidebar
				userData={user ?? undefined}
				serverThreads={serverThreads}
				serverProjects={serverProjects}
			/>
			<main className="flex-1 relative">
				<AppBreadcrumbs />
				{children}
			</main>
		</SidebarProvider>
	);
}
