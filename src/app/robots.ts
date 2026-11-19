import { env, siteUrl } from "@/env";

export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";


export default function robots(): MetadataRoute.Robots {
  const production = env().APP_ENV === "production";
  return {
    rules: production
      ? [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/paneli", "/llogaria", "/shit", "/hyr", "/regjistrohu", "/ruajtura", "/kerko?"] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: production ? `${siteUrl()}/sitemap.xml` : undefined,
  };
}
