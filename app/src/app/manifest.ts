import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShopKeeper — The Joinery",
    short_name: "ShopKeeper",
    description: "Tool maintenance and inventory for The Joinery shop.",
    start_url: "/tools",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#324168",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
