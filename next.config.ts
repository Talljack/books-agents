import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "https",
        hostname: "books.google.com",
      },
      {
        protocol: "http",
        hostname: "books.google.com",
      },
      {
        protocol: "https",
        hostname: "archive.org",
      },
      {
        protocol: "https",
        hostname: "img1.doubanio.com",
      },
      {
        protocol: "https",
        hostname: "img2.doubanio.com",
      },
      {
        protocol: "https",
        hostname: "img3.doubanio.com",
      },
      {
        protocol: "https",
        hostname: "img9.doubanio.com",
      },
    ],
  },
};

export default nextConfig;
