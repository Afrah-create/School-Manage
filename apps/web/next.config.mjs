/** @type {import('next').NextConfig} */
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api\/?$/, "");
let uploadHostname = "localhost";
try {
  uploadHostname = new URL(apiOrigin).hostname;
} catch {
  /* keep default */
}

const nextConfig = {
  transpilePackages: ["@uganda-cbc-sms/shared"],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: uploadHostname,
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: uploadHostname,
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
