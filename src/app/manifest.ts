import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShitShpejt — Okazionet nuk presin",
    short_name: "ShitShpejt",
    description: "Okazione me çmim fiks që zgjasin vetëm 48 orë.",
    lang: "sq",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5ef",
    theme_color: "#14231b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
