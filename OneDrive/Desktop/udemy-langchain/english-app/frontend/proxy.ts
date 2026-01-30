import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    /**
     * NOTE:
     * このアプリの認証は localStorage の `auth_token`(Bearer) を主に利用しており、
     * サーバー側（Middleware相当）では localStorage を参照できません。
     *
     * そのため Cookie(access_token) だけを前提に /session を保護すると
     * 「/session -> /login -> /dashboard」ループが起きやすいので、
     * ここではリダイレクトを行わず、各ページ側のガード（useAuth）/ APIの401処理に任せます。
     */
    void request;
    return NextResponse.next();
}

export const config = {
    // no-op middleware; keep scope minimal
    matcher: ['/session/:path*', '/login', '/signup'],
};
