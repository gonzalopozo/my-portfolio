import { writeFileSync } from 'fs';

const packIds = ['fa', 'fa6', 'io5', 'di', 'ri', 'gr', 'si', 'bi', 'tb', 'lia'];

interface Icon {
	name: string;
	pack: string;
}

const output: Icon[] = [];

for (const packId of packIds) {
	const packageImported = await import(`react-icons/${packId}`);

	const eachPackageIcon = Object.keys(packageImported);

	eachPackageIcon.forEach((icon) => output.push({ name: icon, pack: packId }));
}

writeFileSync('./lib/react-icons-manifest.json', JSON.stringify(output, null, 2));
