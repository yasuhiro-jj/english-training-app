import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // 本番環境では環境変数からバックエンドURLを取得
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/lesson/:path*',
        destination: `${backendUrl}/lesson/:path*`,
      },
    ];
  },
};

export default nextConfig;
