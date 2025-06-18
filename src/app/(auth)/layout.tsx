import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import LoginPrompt from '@/components/home/login-prompt';
import { getAuthToken } from '@/server/clerk';
import { auth } from '@clerk/nextjs/server';
import { api } from 'convex/_generated/api';
import { cookies } from 'next/headers';
import { fetchQuery } from 'convex/nextjs';
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs';

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { userId } = await auth();

	// if user is not logged in, show login prompt
	if (!userId) return <LoginPrompt />;

	const cookieStore = await cookies();
	const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

	const token = await getAuthToken();

	const [user, serverThreads, serverProjects] = token
		? await Promise.all([
				fetchQuery(api.users.getCurrentUser, {}, { token }),
				fetchQuery(api.threads.getUserThreads, {}, { token }),
				fetchQuery(api.projects.getUserProjects, {}, { token }),
		  ])
		: [undefined, [], []];

	// if user is logged in, show the sidebar
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
