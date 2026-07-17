const path = require('path');

/**
 * standalone 产物用于 Docker 部署。Windows 本地构建创建 symlink 需要管理员权限，
 * 故仅在显式开启（BUILD_STANDALONE=1，见 Dockerfile）时启用，避免本地构建失败。
 */
const useStandalone = process.env.BUILD_STANDALONE === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(useStandalone
    ? {
        output: 'standalone',
        experimental: {
          outputFileTracingRoot: path.join(__dirname, '../../'),
        },
      }
    : {}),
  async rewrites() {
    const apiBase = process.env.API_PROXY_TARGET ?? 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
