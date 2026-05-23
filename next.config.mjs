/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: false,
  experimental: {
    optimizePackageImports: [
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/postprocessing",
    ],
  },
  transpilePackages: ["three"],
  webpack: (config) => {
    // Enable async WebAssembly — required for @react-three/rapier (Rapier physics is WASM).
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    // Three.js examples sometimes ship as plain ESM; this keeps imports clean.
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
