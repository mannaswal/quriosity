import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ConvexClientProvider } from '@/auth/convex-client-provider';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/sonner';
import { NextSSRPlugin } from '@uploadthing/react/next-ssr-plugin';
import { extractRouterConfig } from 'uploadthing/server';
import { ourFileRouter } from '@/app/api/uploadthing/core';
import { Funnel_Display } from 'next/font/google';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

const funnelDisplay = Funnel_Display({
	variable: '--font-funnel-display',
	subsets: ['latin'],
	weight: ['500'],
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
	return (
		<html
			lang="en"
			className="dark">
			<head>
				{/* <script
					crossOrigin="anonymous"
					src="//unpkg.com/react-scan/dist/auto.global.js"></script> */}
				<meta
					name="apple-mobile-web-app-title"
					content="Quriosity"
				/>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${funnelDisplay.variable} font-sans antialiased`}>
				<ClerkProvider>
					<ConvexClientProvider>
						<NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
						{children}
						<Toaster
							toastOptions={{
								className: 'rounded-2xl dark:bg-rose-500',
							}}
						/>
					</ConvexClientProvider>
				</ClerkProvider>
			</body>
		</html>
	);
}
