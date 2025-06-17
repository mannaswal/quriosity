import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import LoginPrompt from '@/components/home/login-prompt';
import { getAuthToken } from '@/server/clerk';
import { auth } from '@clerk/nextjs/server';
import { api } from 'convex/_generated/api';
import { cookies } from 'next/headers';
import { fetchQuery, preloadQuery } from 'convex/nextjs';

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { userId } = await auth();
	const cookieStore = await cookies();
	const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

	const token = await getAuthToken();

	const serverThreads = token
		? await fetchQuery(api.threads.getUserThreads, {}, { token })
		: [];
	const serverProjects = token
		? await fetchQuery(api.projects.getUserProjects, {}, { token })
		: [];

	// if user is not logged in, show login prompt
	if (!userId) return <LoginPrompt />;

	// if user is logged in, show the sidebar
	return (
		<SidebarProvider defaultOpen={defaultOpen}>
			<AppSidebar
				serverThreads={serverThreads}
				serverProjects={serverProjects}
			/>
			<main className="flex-1 relative">{children}</main>
		</SidebarProvider>
	);
}
