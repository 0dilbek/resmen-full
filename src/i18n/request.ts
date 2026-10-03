import { getRequestConfig } from "next-intl/server";
import { isLocale } from "./config";
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : "uz";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Asia/Tashkent",
  };
});
