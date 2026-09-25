import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
  // Avoid duplicate/unused font preloads in browsers that load the CSS lazily.
  preload: false,
});

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})();`;

export const metadata: Metadata = {
  title: {
    default: "مراقبو الامتحانات — WhatsApp",
    template: "%s | مراقبو الامتحانات",
  },
  description:
    "نظام لإرسال رسائل WhatsApp مخصصة لكل مراقب بضغطة واحدة. التطبيق لا يرسل أي رسالة تلقائيًا.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "مراقبو الامتحانات",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#075e54" },
    { media: "(prefers-color-scheme: dark)", color: "#0a3d36" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${cairo.variable} antialiased`}>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}