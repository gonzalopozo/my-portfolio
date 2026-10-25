import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { randomBytes } from 'node:crypto';
import { buildCsp, getAdminCspPolicy, getCspHeaderName, getCspMode } from '@/lib/security/csp';
import { getBlobPublicHostname } from '@/lib/blob-environment';

export async function proxy(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	const { pathname } = request.nextUrl;
	const policyType = getAdminCspPolicy(process.env.CSP_ADMIN_POLICY, process.env.VERCEL_ENV);
	const nonce = policyType === 'nonce' ? randomBytes(32).toString('base64') : undefined;
	const mode = getCspMode(process.env.CSP_ADMIN_MODE);
	const policy = buildCsp({
		section: 'admin',
		mode,
		isDevelopment: process.env.NODE_ENV === 'development',
		blobHostname: getBlobPublicHostname(),
		nonce,
	});
	const requestHeaders = new Headers(request.headers);
	// Do not let client-supplied CSP/nonce values affect framework script rendering.
	requestHeaders.delete('x-nonce');
	if (nonce) requestHeaders.set('x-nonce', nonce);
	requestHeaders.delete('Content-Security-Policy-Report-Only');
	requestHeaders.set('Content-Security-Policy', policy);
	let response: NextResponse;

	// Optimistic redirect: logged-in → away from /login
	if (sessionCookie && pathname.startsWith('/login')) {
		response = NextResponse.redirect(new URL('/dashboard', request.url));
	} else if (!sessionCookie && pathname.startsWith('/dashboard')) {
		// Optimistic redirect: logged-out → away from /dashboard
		response = NextResponse.redirect(new URL('/login', request.url));
	} else {
		response = NextResponse.next({ request: { headers: requestHeaders } });
	}
	response.headers.set(getCspHeaderName(mode), policy);
	response.headers.set('Cache-Control', 'private, no-store');
	return response;
}

export const config = {
	matcher: ['/login', '/dashboard/:path*'],
};
