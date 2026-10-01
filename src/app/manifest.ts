import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elara",
    short_name: "Elara",
    description: "Executive operations workspace with reminders, meetings, tasks, and inbox context.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#111827",
    orientation: "portrait",
    icons: [
      { src: "/icon.png", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
