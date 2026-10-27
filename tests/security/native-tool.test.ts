import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
	manifest: {
		pnpm: {
			version: '1.2.3',
			url: 'https://github.com/pnpm/pnpm/releases/download/v1.2.3/pnpm-linux-x64.tar.gz',
			sha256: '',
		},
		gitleaks: {
			version: '1.2.3',
			url: 'https://github.com/gitleaks/gitleaks/releases/download/v1.2.3/gitleaks_1.2.3_linux_x64.tar.gz',
			sha256: '',
		},
	},
	mkdtemp: vi.fn(),
	readdir: vi.fn(),
	lstat: vi.fn(),
	chmod: vi.fn(),
	rm: vi.fn(),
	writeFile: vi.fn(),
	spawnSync: vi.fn(),
}));
vi.mock('../../tooling/binaries.json', () => ({ default: fixture.manifest }));
vi.mock('node:fs/promises', () => fixture);
vi.mock('node:child_process', () => ({ spawnSync: fixture.spawnSync }));
import { nativeTool } from '../../scripts/native-tool.mjs';

const archive = 'synthetic release archive';
const directory = '/tmp/portfolio-tool-fixture';
const fetch = vi.fn<typeof globalThis.fetch>();

beforeEach(() => {
	vi.resetAllMocks();
	vi.stubGlobal('fetch', fetch);
	fixture.manifest.pnpm.version = '1.2.3';
	fixture.manifest.pnpm.url =
		'https://github.com/pnpm/pnpm/releases/download/v1.2.3/pnpm-linux-x64.tar.gz';
	for (const entry of Object.values(fixture.manifest))
		entry.sha256 = createHash('sha256').update(archive).digest('hex');
	fetch.mockImplementation(async () => new Response(archive));
	fixture.mkdtemp.mockResolvedValue(directory);
	fixture.readdir.mockResolvedValue(['pnpm']);
	fixture.lstat.mockResolvedValue({ isFile: () => true });
	fixture.spawnSync.mockReturnValue({ status: 0 });
});
afterEach(() => vi.unstubAllGlobals());

describe('native tool downloads', () => {
	it.each(['unknown', '__proto__', 'constructor'])(
		'rejects unsupported tool %s',
		async (name) => {
			await expect(nativeTool(name)).rejects.toThrow('Unsupported');
			expect(fetch).not.toHaveBeenCalled();
		},
	);

	it.each([
		'http://github.com/pnpm/pnpm/releases/download/v1.2.3/pnpm-linux-x64.tar.gz',
		'https://github.com.evil.test/pnpm/pnpm/releases/download/v1.2.3/pnpm-linux-x64.tar.gz',
		'https://github.com/other/project/releases/download/v1.2.3/pnpm-linux-x64.tar.gz',
		'https://github.com/pnpm/pnpm/releases/download/v1.2.3/pnpm-linux-x64.tar.gz?secret=data',
	])('rejects an unexpected manifest URL before requesting it', async (url) => {
		fixture.manifest.pnpm.url = url;
		await expect(nativeTool('pnpm')).rejects.toThrow('release URL');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejects version data that could change the release path', async () => {
		fixture.manifest.pnpm.version = '../other';
		await expect(nativeTool('pnpm')).rejects.toThrow('metadata');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('requires a pinned SHA-256 checksum before downloading', async () => {
		fixture.manifest.pnpm.sha256 = 'invalid';
		await expect(nativeTool('pnpm')).rejects.toThrow('metadata');
		expect(fetch).not.toHaveBeenCalled();
	});

	it.each([
		'http://release-assets.githubusercontent.com/archive',
		'https://release-assets.githubusercontent.com.evil.test/archive',
		'https://user:secret@release-assets.githubusercontent.com/archive',
		'https://release-assets.githubusercontent.com:8443/archive',
	])('refuses an untrusted redirect destination', async (location) => {
		fetch.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location } }));
		await expect(nativeTool('pnpm')).rejects.toThrow('release redirect');
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fixture.mkdtemp).not.toHaveBeenCalled();
	});

	it('follows a trusted asset redirect without allowing another redirect', async () => {
		const location = 'https://release-assets.githubusercontent.com/archive?signed=fixture';
		fetch.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location } }));
		const tool = await nativeTool('pnpm');
		expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
		expect(fetch.mock.calls[1]).toEqual([
			new URL(location),
			expect.objectContaining({ redirect: 'error' }),
		]);
		await tool.close();
	});

	it('rejects altered bytes before creating files or extracting them', async () => {
		fetch.mockResolvedValueOnce(new Response('altered archive'));
		await expect(nativeTool('pnpm')).rejects.toThrow('checksum mismatch');
		expect(fixture.mkdtemp).not.toHaveBeenCalled();
		expect(fixture.spawnSync).not.toHaveBeenCalled();
		expect(fixture.writeFile).not.toHaveBeenCalled();
	});

	it('extracts verified bytes through stdin and removes the temporary installation on close', async () => {
		const tool = await nativeTool('pnpm');
		expect(fixture.spawnSync).toHaveBeenCalledWith(
			'tar',
			['-xzf', '-', '-C', directory, '--no-same-owner', '--no-same-permissions'],
			{ input: Buffer.from(archive), stdio: ['pipe', 'inherit', 'inherit'] },
		);
		expect(fixture.writeFile).not.toHaveBeenCalled();
		expect(tool.binary).toBe(`${directory}/pnpm`);
		await tool.close();
		expect(fixture.rm).toHaveBeenCalledWith(directory, { recursive: true, force: true });
	});

	it('uses the Gitleaks release path and finds its executable in a nested directory', async () => {
		fixture.readdir.mockResolvedValueOnce(['nested/gitleaks']);
		const tool = await nativeTool('gitleaks');
		expect(fetch.mock.calls[0][0]).toBe(fixture.manifest.gitleaks.url);
		expect(tool.binary).toBe(`${directory}/nested/gitleaks`);
		await tool.close();
	});

	it('cleans up after extraction fails', async () => {
		fixture.spawnSync.mockReturnValueOnce({ status: 1 });
		await expect(nativeTool('pnpm')).rejects.toThrow('extraction failed');
		expect(fixture.rm).toHaveBeenCalledWith(directory, { recursive: true, force: true });
	});

	it('rejects a symbolic link in place of the executable', async () => {
		fixture.lstat.mockResolvedValueOnce({ isFile: () => false });
		await expect(nativeTool('pnpm')).rejects.toThrow('executable missing');
		expect(fixture.chmod).not.toHaveBeenCalled();
		expect(fixture.rm).toHaveBeenCalledWith(directory, { recursive: true, force: true });
	});
});
