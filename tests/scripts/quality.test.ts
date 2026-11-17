import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
	spawnSync: vi.fn<(command: string, args: string[], options: unknown) => unknown>(),
	architecture: vi.fn(),
}));
vi.mock('node:child_process', () => ({ spawnSync: fixture.spawnSync }));
vi.mock('vitest/package.json', () => ({ default: { version: '1.0.0' } }));
vi.mock('@vitest/coverage-v8/package.json', () => ({ default: { version: '1.0.0' } }));

beforeEach(() => {
	vi.resetModules();
	vi.resetAllMocks();
	vi.spyOn(process.stderr, 'write').mockReturnValue(true);
	fixture.spawnSync.mockImplementation((_command: string, args: string[]) =>
		args[0] === 'exec' ? fixture.architecture() : { status: 0 },
	);
	fixture.architecture.mockReturnValue({
		status: 0,
		stdout: JSON.stringify({ summary: { error: 0, warn: 0 } }),
		stderr: '',
	});
});
afterEach(() => vi.restoreAllMocks());

describe('CI architecture quality gate', () => {
	it('analyzes existing source entries and accepts a clean report', async () => {
		await import('../../scripts/quality.mjs');
		const args = fixture.spawnSync.mock.calls.at(-1)?.[1] ?? [];
		expect(args.slice(0, 2)).toEqual(['exec', 'depcruise']);
		const sources = args.slice(2, args.indexOf('--config'));
		expect(sources).toEqual(expect.arrayContaining(['app', 'components', 'lib', 'db']));
		expect(sources.filter((source) => !existsSync(source))).toEqual([]);
		expect(process.stderr.write).not.toHaveBeenCalled();
	});

	it('shows scanner diagnostics when analysis fails before producing a report', async () => {
		const diagnostic = "Can't open 'missing.ts' for reading. Does it exist?\n";
		fixture.architecture.mockReturnValue({ status: 1, stdout: '', stderr: diagnostic });
		await expect(import('../../scripts/quality.mjs')).rejects.toThrow(
			'Architecture analysis failed.',
		);
		expect(process.stderr.write).toHaveBeenCalledWith(diagnostic);
	});

	it('shows the violation report when the scanner exits with an error', async () => {
		const report = JSON.stringify({ summary: { error: 1, warn: 0 } });
		fixture.architecture.mockReturnValue({ status: 1, stdout: report, stderr: '' });
		await expect(import('../../scripts/quality.mjs')).rejects.toThrow(
			'Architecture analysis failed.',
		);
		expect(process.stderr.write).toHaveBeenCalledWith(report);
	});

	it('preserves a process startup error as the failure cause', async () => {
		const error = new Error('spawnSync pnpm ENOENT');
		fixture.architecture.mockReturnValue({ status: null, stdout: null, stderr: null, error });
		await expect(import('../../scripts/quality.mjs')).rejects.toMatchObject({
			message: 'Architecture analysis failed.',
			cause: error,
		});
	});

	it.each([
		{ error: 1, warn: 0 },
		{ error: 0, warn: 1 },
	])('blocks a zero-exit report with findings: %j', async (summary) => {
		const report = JSON.stringify({ summary });
		fixture.architecture.mockReturnValue({ status: 0, stdout: report, stderr: '' });
		await expect(import('../../scripts/quality.mjs')).rejects.toThrow(
			'Architecture errors and warnings block CI.',
		);
		expect(process.stderr.write).toHaveBeenCalledWith(report);
	});
});
