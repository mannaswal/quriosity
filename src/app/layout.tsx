import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { ConvexClientProvider } from '@/auth/convex-client-provider';
import { ClerkProvider } from '@clerk/nextjs';
import { TRPCProvider } from '@/server/trpc/provider';
import { Toaster } from '@/components/ui/sonner';
import { cookies } from 'next/headers';

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
	const cookieStore = await cookies();
	const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

	return (
		<html lang="en">
			<head>
				<script
					crossOrigin="anonymous"
					src="//unpkg.com/react-scan/dist/auto.global.js"
				/>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased dark`}>
				<ClerkProvider>
					<ConvexClientProvider>
						<TRPCProvider>
							<SidebarProvider defaultOpen={defaultOpen}>
								<AppSidebar />
								<main className="flex-1">{children}</main>
							</SidebarProvider>
							<Toaster />
						</TRPCProvider>
					</ConvexClientProvider>
				</ClerkProvider>
			</body>
		</html>
	);
}
