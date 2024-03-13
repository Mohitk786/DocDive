/** @type {import('next').NextConfig} */
const nextConfig = {

    //webpack is written becase pdf renderer was not working
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        config.resolve.alias['canvas'] = false;
        config.resolve.alias['encoding'] = false;
        return config;
      },
      images: {
        domains: [
          'lh3.googleusercontent.com',
        ],
      },
      experimental: {
          missingSuspenseWithCSRBailout: false,
        },
};



export default nextConfig;
