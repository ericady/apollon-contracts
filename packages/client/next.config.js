/** @type {import('next').NextConfig} */
const nextConfig = {
  // For now we are creating a SPA without performance feature of Next.
  // This comes with some limitations: https://nextjs.org/docs/pages/building-your-application/deploying/static-exports
  // Once we migrate change MUI integration: https://mui.com/material-ui/guides/nextjs/
  output: 'export',
  reactStrictMode: true,
};

module.exports = nextConfig;
