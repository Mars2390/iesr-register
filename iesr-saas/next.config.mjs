/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // jsPDF is browser-only; keep it out of the server bundle where imported in client components.
  },
};

export default nextConfig;
