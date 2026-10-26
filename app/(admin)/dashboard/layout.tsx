import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminHeader } from '@/components/admin/header';
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { getAdminSession } from '@/lib/admin';
import { getServerSession } from '@/lib/server-session';
import { ClearInvalidSessionForm } from '@/components/auth/clear-invalid-session-form';
import { LogOutButton } from '@/components/auth/logout';

export const metadata: Metadata = {
	title: 'Admin Dashboard | Portfolio CMS',
	description: 'Manage your portfolio content',
};

function AdminSidebarFallback() {
	return <aside className="hidden w-64 border-r border-border bg-card lg:block" />;
}

function AdminHeaderFallback() {
	return (
		<header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6" />
	);
}

async function AuthorizedDashboard({ children }: { children: ReactNode }) {
	const session = await getServerSession();
	if (!session) return <ClearInvalidSessionForm />;
	if (!(await getAdminSession())) {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
				<h1 className="text-2xl font-semibold">Access denied</h1>
				<p className="text-muted-foreground">This account cannot access the dashboard.</p>
				<LogOutButton />
			</main>
		);
	}
	return (
		<div className="flex min-h-screen bg-background">
			<Suspense fallback={<AdminSidebarFallback />}>
				<AdminSidebar />
			</Suspense>
			<div className="flex min-w-0 flex-1 flex-col">
				<Suspense fallback={<AdminHeaderFallback />}>
					<AdminHeader />
				</Suspense>
				<main className="flex-1 p-6">{children}</main>
			</div>
		</div>
	);
}

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<Suspense
			fallback={
				<p className="p-6" role="status">
					Loading dashboard…
				</p>
			}
		>
			<AuthorizedDashboard>{children}</AuthorizedDashboard>
		</Suspense>
	);
}
