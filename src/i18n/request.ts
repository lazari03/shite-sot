import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

/** No locale prefix in URLs: Albanian by default, English via cookie (language switcher). */
export default getRequestConfig(async () => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(c) ? c : DEFAULT_LOCALE;
  return {
    locale,
    timeZone: "Europe/Tirane",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
