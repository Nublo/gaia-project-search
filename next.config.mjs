/** @type {import('next').NextConfig} */
const nextConfig = {
  // The dev-tools route indicator/segment explorer throws
  // ("t.children is undefined" in segmentExplorerNodeAdd) when
  // client-navigating into a brand-new route it hasn't seen before.
  // Disabling just the indicator avoids that — real error overlays for
  // actual app bugs are a separate mechanism and stay on.
  devIndicators: false,
};

export default nextConfig;
