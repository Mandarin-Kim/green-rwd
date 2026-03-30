/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode 활성�x
  reactStrictMode: true,

  // 이미지 도메인 설정 (필요 시 추가)
  images: {
    domains: [],
  },

  // 환경변수
  env: {
    NEXT_PUBLIC_APP_NAME: 'Green-RWD',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

    // TypeScript build errors ignore
    typescript: {
          ignoreBuildErrors: true,
    },

    // ESLint ignore during builds
    eslint: {
          ignoreDuringBuilds: true,
    },
}

module.exports = nextConfig
