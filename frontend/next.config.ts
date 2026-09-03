import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.0.181",
    "100.64.1.103",
    "192.168.150.66",
  ],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_MONTHLY:
      process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_MONTHLY,
    NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_YEARLY:
      process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC_YEARLY,
    NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_MONTHLY:
      process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_MONTHLY,
    NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_YEARLY:
      process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM_YEARLY,
    NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED:
      process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST_SHARED,
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ];
    }
    return [];
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // 開発環境ではPWAを無効化
  register: true,
  skipWaiting: true,
});

const config = pwaConfig(nextConfig);
export default { ...config, allowedDevOrigins: nextConfig.allowedDevOrigins };
