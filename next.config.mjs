/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['assemblyai']
  },
  images: {
    domains: ['blob.vercel-storage.com']
  }
}

export default nextConfig