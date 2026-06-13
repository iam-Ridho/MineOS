/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CESIUM_BASE_URL: "/cesium",
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        http: false,
        https: false,
        zlib: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;