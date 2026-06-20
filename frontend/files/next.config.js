/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // CORS untuk API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },

  // 🛠️ Perbaikan Webpack untuk Mengatasi Eror "Octal escape" & "ChunkLoadError" Cesium
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
      };
    }

    // Menghentikan evaluasi ekspresi kritis yang merusak struktur potongan file (chunks) Cesium
    config.module = {
      ...config.module,
      unknownContextCritical: false,
      exprContextCritical: false,
    };

    return config;
  },
};

module.exports = nextConfig;