import { describe, expect, it } from 'vitest';
import { projectSchema } from '@/lib/schemas/projects';
import { experienceSchema } from '@/lib/schemas/experiences';
import { settingsSchema } from '@/lib/schemas/settings';

const project = {
	title: 'Project',
	description: 'Text',
	url: 'https://example.com',
	repoUrl: '',
	status: 'active',
	skillIds: ['1', '2', '1'],
};
const experience = {
	role: 'Developer',
	company: 'Company',
	description: 'Text',
	companyUrl: '',
	companyLogo: '',
	startDate: '2025-01-01',
	endDate: '',
	location: '',
	skillIds: [],
};

describe('CMS mutation validation', () => {
	it('deduplicates valid skill IDs and accepts an empty selection', () => {
		expect(projectSchema.parse(project).skillIds).toEqual([1, 2]);
		expect(projectSchema.safeParse({ ...project, skillIds: [] }).success).toBe(true);
	});
	it.each(['-1', '0', '1.5', 'NaN', '1e2', '9007199254740992'])(
		'rejects malformed skill ID %s',
		(id) => {
			expect(projectSchema.safeParse({ ...project, skillIds: [id] }).success).toBe(false);
		},
	);
	it('rejects unsafe URLs, files in text fields, and invalid status before writes', () => {
		expect(projectSchema.safeParse({ ...project, url: 'javascript:alert(1)' }).success).toBe(
			false,
		);
		expect(projectSchema.safeParse({ ...project, url: 'http://example.com' }).success).toBe(
			false,
		);
		expect(projectSchema.safeParse({ ...project, title: new Blob(['title']) }).success).toBe(
			false,
		);
		expect(projectSchema.safeParse({ ...project, status: 'deleted' }).success).toBe(false);
	});
	it('validates date ranges and rejects unsafe company image sources', () => {
		expect(experienceSchema.safeParse(experience).success).toBe(true);
		expect(experienceSchema.safeParse({ ...experience, endDate: '2024-01-01' }).success).toBe(
			false,
		);
		expect(experienceSchema.safeParse({ ...experience, startDate: '2025-02-30' }).success).toBe(
			false,
		);
		expect(
			experienceSchema.safeParse({ ...experience, companyLogo: 'data:image/svg+xml,<svg/>' })
				.success,
		).toBe(false);
	});
	it('prevents unsafe resume links while retaining plain text', () => {
		expect(
			settingsSchema.safeParse({
				isEmployed: false,
				resumeUrl: 'javascript:alert(1)',
				statusMessage: '',
			}).success,
		).toBe(false);
		expect(
			settingsSchema.parse({
				isEmployed: false,
				resumeUrl: '',
				statusMessage: '<script>test</script>',
			}).statusMessage,
		).toBe('<script>test</script>');
	});
});
