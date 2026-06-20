const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,

  async rewrites() {
    return [
      {
        source: '/api/agents/:path*',
        destination: 'https://judo-flashback-devotion.ngrok-free.dev/api/agents/:path*',
      },
      {
        source: '/api/vehicles/:path*',
        destination: 'https://judo-flashback-devotion.ngrok-free.dev/api/vehicles/:path*',
      },
      {
        source: '/api/emissions/:path*',
        destination: 'https://judo-flashback-devotion.ngrok-free.dev/api/emissions/:path*',
      },
      {
        source: '/api/health',
        destination: 'https://judo-flashback-devotion.ngrok-free.dev/health',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, ngrok-skip-browser-warning' },
        ],
      },
    ];
  },

  env: {
    NEXT_PUBLIC_CESIUM_BASE_URL: '/cesium',
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Copy asset Cesium ke /public/cesium saat build
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Workers'),
              to: path.join(__dirname, 'public/cesium/Workers'),
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/ThirdParty'),
              to: path.join(__dirname, 'public/cesium/ThirdParty'),
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Assets'),
              to: path.join(__dirname, 'public/cesium/Assets'),
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Widgets'),
              to: path.join(__dirname, 'public/cesium/Widgets'),
            },
          ],
        })
      );

      config.resolve.alias = {
        ...config.resolve.alias,
        cesium: path.resolve(__dirname, 'node_modules/cesium'),
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
        path: false,
      };
    }

    config.module.unknownContextCritical = false;
    config.module.exprContextCritical = false;

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
};

module.exports = nextConfig;