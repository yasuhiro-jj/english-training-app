import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    /**
     * NOTE:
     * このフロントは localStorage の `auth_token`(Bearer) を主に使って認証します。
     * サーバー側（Middleware相当）から localStorage は参照できないため、
     * Cookie(access_token) だけで /session を保護すると
     * 「/session -> /login -> /dashboard」ループが発生します。
     *
     * ここではリダイレクトを行わず、各ページ側のガード（useRequireAuth）と
     * APIの401処理に任せます。
     */
    void request;
    return NextResponse.next();
}

export const config = {
    matcher: ['/session/:path*', '/login', '/signup'],
};
