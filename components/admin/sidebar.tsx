'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
	LayoutDashboard,
	FolderKanban,
	Briefcase,
	Wrench,
	Settings,
	Link2,
	Music,
	type LucideIcon,
	Boxes,
} from 'lucide-react';

interface Link {
	name: string;
	href: string;
	icon: LucideIcon;
}

const navigation: Link[] = [
	{ name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
	{ name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
	{ name: 'Experiences', href: '/dashboard/experiences', icon: Briefcase },
	{ name: 'Skills', href: '/dashboard/skills', icon: Wrench },
	{ name: 'Social Links', href: '/dashboard/social-links', icon: Link2 },
	{ name: 'Music Status', href: '/dashboard/music-status', icon: Music },
	{ name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function AdminSidebar() {
	const pathname = usePathname();

	return (
		<aside className="hidden w-64 border-r border-border bg-card lg:block">
			<div className="flex h-full flex-col">
				<div className="flex h-16 items-center border-b border-border px-3">
					<Link
						href="/dashboard"
						className="flex w-full items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
					>
						<Boxes className="size-4" />
						<span>Dashboard</span>
					</Link>
				</div>
				<nav className="flex-1 space-y-1 px-3 py-4">
					{navigation.map((link: Link) => {
						const isActive =
							pathname === link.href ||
							(link.href !== '/dashboard' && pathname.startsWith(link.href));
						return (
							<Link
								key={link.name}
								href={link.href}
								className={cn(
									`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors`,
									isActive
										? 'bg-accent text-accent-foreground'
										: `text-muted-foreground hover:bg-accent hover:text-accent-foreground`,
								)}
							>
								<link.icon className="size-4" />
								{link.name}
							</Link>
						);
					})}
				</nav>
			</div>
		</aside>
	);
}
