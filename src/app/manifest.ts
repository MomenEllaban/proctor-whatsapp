import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نظام إدارة ومتابعة المراقبين",
    short_name: "متابعة المراقبين",
    description:
      "نظام عام لإدارة قوائم المراقبين وفتح رسائل WhatsApp مخصصة لكل مراقب بضغطة واحدة. لا يرسل التطبيق أي شيء تلقائيًا.",
    lang: "ar",
    dir: "rtl",
    display: "standalone",
    orientation: "any",
    start_url: "/lists",
    scope: "/",
    background_color: "#f1f4f7",
    theme_color: "#16273a",
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