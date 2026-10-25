import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

const LOGIN_PATH = '/login';
const SESSION_COOKIE_NAMES = [
	{ name: 'better-auth.session_token', secure: false },
	{ name: 'better-auth.session_data', secure: false },
	{ name: '__Secure-better-auth.session_token', secure: true },
	{ name: '__Secure-better-auth.session_data', secure: true },
] as const;

export function GET(request: NextRequest) {
	return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}

export async function POST(request: NextRequest) {
	const origin = request.headers.get('origin');

	if (origin !== request.nextUrl.origin) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const cookieStore = await cookies();

	for (const { name, secure } of SESSION_COOKIE_NAMES) {
		cookieStore.set(name, '', {
			httpOnly: true,
			maxAge: 0,
			path: '/',
			sameSite: 'lax',
			secure,
		});
	}

	return NextResponse.redirect(new URL(LOGIN_PATH, request.url), 303);
}
