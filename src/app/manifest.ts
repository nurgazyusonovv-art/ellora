import type { MetadataRoute } from "next";

/** Телефонго колдонмо катары орнотуу (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ellora — информатика сабактары",
    short_name: "ellora",
    description: "Информатика сабактарын 5 бөлүктүү методика менен онлайн өтүү.",
    lang: "ky",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f5f3",
    theme_color: "#15242a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
