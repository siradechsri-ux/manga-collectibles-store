/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

    // When mock mode is OFF, proxy all /api/* calls to the standalone Express server.
    // afterFiles runs AFTER Next.js internal API Routes so the Next.js catalog/slip
    // routes (which early-return 404 when mock is off) correctly fall through to Express.
    if (!useMock) {
      return {
        afterFiles: [
          {
            source: "/api/:path*",
            destination: `${apiBase}/api/:path*`,
          },
        ],
      };
    }

    // Mock mode: let Next.js handle its own /api routes normally (no rewrite needed).
    return [];
  },
};

export default nextConfig;

