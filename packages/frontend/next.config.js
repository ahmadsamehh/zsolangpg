/** @type {import("next").NextConfig} */
const nextConfig = {
  // Configure static export
  output: "export",

  // Optional: Add other Next.js configuration options here if needed
  // For example, to handle potential issues with wasm or other dependencies:
  // webpack: (config, { isServer }) => {
  //   // Fixes npm packages that depend on `fs` module
  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //     };
  //   }
  //   config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
  //   return config;
  // },
};

module.exports = nextConfig;

