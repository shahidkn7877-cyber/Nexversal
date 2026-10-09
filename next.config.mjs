import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    // Strict isolation of development and production build artifacts
    // Prevents next dev and next start from competing or deleting each other's CSS/JS assets
    distDir: isDev ? '.next-dev' : '.next',
  };
}
