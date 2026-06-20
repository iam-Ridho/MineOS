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
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, ngrok-skip-browser-warning' },
        ],
      },
    ];
  },

  // 🛠️ PERBAIKAN WEBPACK CESIUM YANG BENAR & STRUKTURAL
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

    // Perbaikan Evaluasi Ekspresi Kritis Cesium (Diletakkan di level objek yang tepat)
    config.module = {
      ...config.module,
    };
    
    // Mencegah Webpack memutus chunk muatan Cesium akibat warning internal string evaluasi
    config.module.unknownContextCritical = false;
    config.module.exprContextCritical = false;

    return config;
  },
};

module.exports = nextConfig;