import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { ConvexClientProvider } from './convex-client-provider';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'M3 Chat',
	description: 'Made for the T3 Chat Cloneathon',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased dark`}>
				<ConvexClientProvider>
					<SidebarProvider>
						<AppSidebar />
						<main className="flex-1">{children}</main>
					</SidebarProvider>
				</ConvexClientProvider>
			</body>
		</html>
	);
}
