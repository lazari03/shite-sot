import { siteUrl } from "@/env";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "@/styles/globals.css";
import { ServiceWorkerRegister } from "@/ui/sw-register";

const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["500", "700", "800"], variable: "--font-bricolage", display: "swap" });
const sans = DM_Sans({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-dm-sans", display: "swap" });


export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("title"), template: "%s — ShitShpejt" },
    description: t("description"),
    applicationName: "ShitShpejt",
    appleWebApp: { capable: true, title: "ShitShpejt", statusBarStyle: "default" },
    openGraph: { type: "website", siteName: "ShitShpejt", locale: "sq_AL", title: t("title"), description: t("description") },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f5ef",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
