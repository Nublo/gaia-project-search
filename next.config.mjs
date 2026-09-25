/** @type {import('next').NextConfig} */
const nextConfig = {
  // The dev-tools route indicator/segment explorer throws
  // ("t.children is undefined" in segmentExplorerNodeAdd) when
  // client-navigating into a brand-new route it hasn't seen before.
  // Disabling just the indicator avoids that — real error overlays for
  // actual app bugs are a separate mechanism and stay on.
  devIndicators: false,
  // 3p and 4p auction articles were merged into a single page.
  async redirects() {
    return [
      { source: '/auction-rules/3p', destination: '/auction-rules/3-4p', permanent: true },
      { source: '/auction-rules/4p', destination: '/auction-rules/3-4p', permanent: true },
    ];
  },
};

export default nextConfig;
