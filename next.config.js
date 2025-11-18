/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Static export for Vercel deployment
  output: 'export',
  trailingSlash: true,
  
  // Image optimization disabled for static export
  images: {
    unoptimized: true
  },

  // Rewrites for API compatibility
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*'
      }
    ];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    claude_api_key: process.env.claude_api_key,
    naver_client_id: process.env.naver_client_id
  }
}

module.exports = nextConfig