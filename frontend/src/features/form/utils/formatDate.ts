import { getLocale } from "@/i18n/translate";

export const formatDate = (date: string) =>
  new Date(date).toLocaleString(getLocale(), {
    dateStyle: "short",
    timeStyle: "short",
  });
