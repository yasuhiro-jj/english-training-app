import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const token = request.cookies.get('access_token');
    const { pathname } = request.nextUrl;

    // 保護したいルートのリスト
    const protectedRoutes = ['/session'];

    // もし保護されたルートにアクセスしようとしていて、トークンがない場合
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
        if (!token) {
            const url = new URL('/login', request.url);
            return NextResponse.redirect(url);
        }
    }

    // すでにログインしているのに、ログイン/サインアップ画面に行こうとした場合
    if (pathname === '/login' || pathname === '/signup') {
        if (token) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/session/:path*', '/login', '/signup'],
};
