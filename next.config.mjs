/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/host',
        permanent: true,
      },
      {
        source: '/admin/:path*',
        destination: '/host/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
