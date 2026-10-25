'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
	Menu,
	LayoutDashboard,
	FolderKanban,
	Briefcase,
	Wrench,
	Settings,
	Link2,
	Music,
	ExternalLink,
	Boxes,
} from 'lucide-react';

// interface AdminHeaderProps {
//   user: {
//     name: string
//     email: string
//     image?: string | null
//   }
// }

const navigation = [
	{ name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
	{ name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
	{ name: 'Experiences', href: '/dashboard/experiences', icon: Briefcase },
	{ name: 'Skills', href: '/dashboard/skills', icon: Wrench },
	{ name: 'Social Links', href: '/dashboard/social-links', icon: Link2 },
	{ name: 'Music Status', href: '/dashboard/music-status', icon: Music },
	{ name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// TODO: { user }: AdminHeaderProps ???
export function AdminHeader() {
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
			<div className="flex items-center gap-4">
				<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
					<SheetTrigger asChild>
						<Button variant="ghost" size="icon" className="lg:hidden">
							<Menu className="size-5" />
							<span className="sr-only">Toggle menu</span>
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-64 p-0">
						<div className="flex h-16 items-center border-b border-border px-3 pr-12">
							<Link
								href="/dashboard"
								className="flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
								onClick={() => setMobileMenuOpen(false)}
							>
								<Boxes className="size-4" />
								<span>Dashboard</span>
							</Link>
						</div>
						<nav className="space-y-1 px-3 py-4">
							{navigation.map((item) => {
								const isActive =
									pathname === item.href ||
									(item.href !== '/dashboard' && pathname.startsWith(item.href));
								return (
									<Link
										key={item.name}
										href={item.href}
										onClick={() => setMobileMenuOpen(false)}
										className={cn(
											`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors`,
											isActive
												? 'bg-accent text-accent-foreground'
												: `text-muted-foreground hover:bg-accent hover:text-accent-foreground`,
										)}
									>
										<item.icon className="size-4" />
										{item.name}
									</Link>
								);
							})}
						</nav>
					</SheetContent>
				</Sheet>
				<div className="lg:hidden">
					<Link
						href="/dashboard"
						className="flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
					>
						<Boxes className="size-4" />
						<span>Dashboard</span>
					</Link>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" asChild>
					<a href="/" target="_blank" rel="noopener noreferrer">
						<ExternalLink className="mr-2 size-4" />
						View Site
					</a>
				</Button>

				{/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <span className="text-sm font-medium">{user.name?.charAt(0).toUpperCase() || "A"}</span>
              </div>
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
            // TODO: logout button
              <Link href="/dashboard/settings">
                <User className="mr-2 h-4 w-4" />
                Logout
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
			</div>
		</header>
	);
}
