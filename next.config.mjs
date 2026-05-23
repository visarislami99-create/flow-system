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
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
