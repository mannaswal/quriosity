import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { ConvexClientProvider } from '@/auth/convex-client-provider';
import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { Toaster } from '@/components/ui/sonner';
import { cookies } from 'next/headers';
import { NextSSRPlugin } from '@uploadthing/react/next-ssr-plugin';
import { extractRouterConfig } from 'uploadthing/server';
import { ourFileRouter } from '@/app/api/uploadthing/core';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata = {
	title: 'Quriosity',
	description: 'Made for the T3 Chat Cloneathon',
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { userId } = await auth();
	const cookieStore = await cookies();
	const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

	return (
		<html
			lang="en"
			className="dark">
			<head>
				<meta
					name="apple-mobile-web-app-title"
					content="Quriosity"
				/>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
				<ClerkProvider>
					<ConvexClientProvider>
						<NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
						{userId ? (
							<SidebarProvider defaultOpen={defaultOpen}>
								<AppSidebar />
								<main className="flex-1 relative">{children}</main>
							</SidebarProvider>
						) : (
							<main className="flex-1 relative">{children}</main>
						)}
						<Toaster />
					</ConvexClientProvider>
				</ClerkProvider>
			</body>
		</html>
	);
}
