import { requireAdminPage } from '@/lib/admin';
import { ProjectsDashboard } from '@/components/admin/projects-dashboard';
import { deleteProject, refreshProjectOgImage } from '@/lib/actions/projects';
import { parseOgImageWarning } from '@/lib/og-image-feedback';
import { getProjects } from '@/lib/queries/projects';

export default async function ProjectsDashboardPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	await requireAdminPage();
	const projectsData = await getProjects();
	const initialFeedback = parseOgImageWarning(await searchParams);

	return (
		<ProjectsDashboard
			projects={projectsData}
			initialFeedback={initialFeedback}
			onDelete={deleteProject}
			refreshOgImage={refreshProjectOgImage}
		/>
	);
}
