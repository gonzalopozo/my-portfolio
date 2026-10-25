import { ClearInvalidSessionForm } from '@/components/auth/clear-invalid-session-form';
import { LogOutButton } from '@/components/auth/logout';
import { getServerSession } from '@/lib/server-session';
import { getAdminSession } from '@/lib/admin';

export default async function AdminDashboard() {
	const session = await getServerSession();

	if (!session) {
		return <ClearInvalidSessionForm />;
	}
	if (!(await getAdminSession())) {
		return (
			<div className="space-y-4 p-6">
				<h1 className="text-2xl font-semibold">Access denied</h1>
				<p>This account cannot access the dashboard.</p>
				<LogOutButton />
			</div>
		);
	}

	const user = session.user;
	const sessionDetails = [
		['ID', user.id],
		['Name', user.name],
		['Email', user.email],
		[
			'Created At',
			new Date(user.createdAt).toLocaleDateString('es-ES', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
			}),
		],
		['IP Address', session.session.ipAddress ?? 'Unknown'],
	] as const;

	return (
		<div className="flex h-screen flex-col items-center justify-center">
			<h1 className="text-2xl font-semibold">You are logged in:</h1>
			<ul className="mt-4 list-inside list-disc text-left text-sm">
				{sessionDetails.map(([label, value]) => (
					<li
						key={label}
						className="border-b border-border p-2 text-lg font-bold text-muted-foreground"
					>
						{label}: {value}
					</li>
				))}
			</ul>
			<LogOutButton />
			{/* <form action={signOutAction} className="flex flex-col">
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700">Log out!</button>
                <input type="submit" value="Log out!" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700" />
            </form> */}
		</div>
	);
}
