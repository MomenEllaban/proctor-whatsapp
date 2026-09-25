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
    default: "نظام إدارة ومتابعة المراقبين",
    template: "%s | نظام إدارة ومتابعة المراقبين",
  },
  description:
    "نظام عام لإدارة ومتابعة المراقبين: قوائم مراقبين ورسائل WhatsApp مخصصة بضغطة واحدة. لا يرسل أي رسالة تلقائيًا.",
  applicationName: "نظام إدارة ومتابعة المراقبين",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "متابعة المراقبين",
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
    { media: "(prefers-color-scheme: light)", color: "#16273a" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1622" },
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