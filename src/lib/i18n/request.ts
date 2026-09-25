import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { resolveLocale } from "./locale";

export default getRequestConfig(async () => {
  const cookie = (await cookies()).get("pc_locale")?.value;
  const locale = resolveLocale(cookie);
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
