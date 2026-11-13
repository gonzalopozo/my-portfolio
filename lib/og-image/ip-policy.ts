import 'server-only';

/**
 * Retorna true/false dependiendo de si la dirección IP es invalida o valida respectivamente.
 * @param ip Dirección IP recibida
 * @returns Retorna true si es una IP invalida y false si es valida.
 */
export function isInvalidIpV4(ip: string): boolean {
	const octets = ip.split('.').map(Number);
	if (octets.length !== 4 || octets.some((p) => isNaN(p))) return true;

	const [a, b, c] = octets;

	if (
		a === 0 ||
		a === 10 ||
		(a === 100 && b >= 64 && b <= 127) ||
		a === 127 ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 0 && c === 0) ||
		(a === 192 && b === 0 && c === 2) ||
		(a === 192 && b === 88 && c === 99) ||
		(a === 192 && b === 168) ||
		(a === 198 && b >= 18 && b <= 19) ||
		(a === 198 && b === 51 && c === 100) ||
		(a === 203 && b === 0 && c === 113) ||
		a >= 224
	)
		return true;

	return false;
}

export function isInvalidIpV6(ip: string): boolean {
	if (ip.split('::').length > 2) return true;

	let ipFilled;

	if (ip.includes('::')) {
		const ipSplitParts = ip.split('::');

		const leftIpPart = ipSplitParts[0].split(':');
		const rightIpPart = ipSplitParts[1].split(':');

		const leftGroupsCount =
			leftIpPart.length === 1 && leftIpPart[0] === '' ? 0 : leftIpPart.length;
		const rightGroupsCount =
			rightIpPart.length === 1 && rightIpPart[0] === '' ? 0 : rightIpPart.length;

		const zeroGroupsToAdd = 8 - leftGroupsCount - rightGroupsCount;

		let zerosFiller = '';

		if (leftGroupsCount !== 0) zerosFiller += ':';
		for (let i = 0; i < zeroGroupsToAdd; i++) {
			zerosFiller += '0:';
		}
		if (rightGroupsCount === 0) zerosFiller = zerosFiller.slice(0, -1);

		ipFilled = ip.replaceAll('::', zerosFiller);
	} else ipFilled = ip;

	const groups = ipFilled.split(':').map((hexGroup) => parseInt(hexGroup, 16));
	if (groups.length !== 8 || groups.some((p) => isNaN(p))) return true;

	const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;

	if (
		(g0 === 0 &&
			g1 === 0 &&
			g2 === 0 &&
			g3 === 0 &&
			g4 === 0 &&
			g5 === 0 &&
			g6 === 0 &&
			g7 >= 0 &&
			g7 <= 1) ||
		(g0 === 100 && g1 === 65435 && g2 === 1) ||
		(g0 === 256 && g1 === 0 && g2 === 0 && g3 === 0) ||
		(g0 === 8193 && g1 === 0) ||
		(g0 === 8193 && g1 === 2) ||
		(g0 === 8193 && g1 >= 16 && g1 <= 31) ||
		(g0 === 8193 && g1 === 3512) ||
		g0 === 8194 ||
		(g0 >= 64512 && g0 <= 65023) ||
		(g0 >= 65152 && g0 <= 65215) ||
		g0 >= 65280
	)
		return true;

	if (
		(g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 65535) ||
		(g0 === 100 && g1 === 65435 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0)
	) {
		const octet1 = g6 >> 8;
		const octet2 = g6 & 255;
		const octet3 = g7 >> 8;
		const octet4 = g7 & 255;

		const extractedIpV4 = `${octet1}.${octet2}.${octet3}.${octet4}`;

		if (isInvalidIpV4(extractedIpV4)) return true;
	}

	return false;
}
