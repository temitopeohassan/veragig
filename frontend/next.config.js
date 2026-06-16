/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    // pino (via WalletConnect) lazily requires pino-pretty, an optional dev-only
    // pretty-printer we don't ship. Mark it external to silence the build warning.
    config.externals.push("pino-pretty");
    return config;
  },
};

module.exports = nextConfig;
