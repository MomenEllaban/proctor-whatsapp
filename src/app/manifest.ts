import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مراقبو الامتحانات — WhatsApp",
    short_name: "المراقبون",
    description:
      "إدارة قوائم المراقبين وإرسال رسائل WhatsApp مخصصة لكل مراقب بضغطة واحدة. لا يرسل التطبيق أي شيء تلقائيًا.",
    lang: "ar",
    dir: "rtl",
    display: "standalone",
    orientation: "any",
    start_url: "/lists",
    scope: "/",
    background_color: "#f0f4f2",
    theme_color: "#075e54",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}