/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Proxy ke Backend Ridho (10.100.148.67:8000)
      {
        source: '/api/agents/:path*',
        destination: 'http://10.100.148.67:8000/api/agents/:path*',
      },
      {
        source: '/api/vehicles/:path*',
        destination: 'http://10.100.148.67:8000/api/vehicles/:path*',
      },
      {
        source: '/api/emissions/:path*',
        destination: 'http://10.100.148.67:8000/api/emissions/:path*',
      },
      {
        source: '/api/health',
        destination: 'http://10.100.148.67:8000/health',
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