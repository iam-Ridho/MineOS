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
};

module.exports = nextConfig;