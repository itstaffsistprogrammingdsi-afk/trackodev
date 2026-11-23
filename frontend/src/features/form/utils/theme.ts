export const FORM_THEMES = [
  { label: "Tracko", value: "#3f51f5" },
  { label: "Teal", value: "#0f766e" },
  { label: "Amber", value: "#b45309" },
  { label: "Rose", value: "#be123c" },
  { label: "Graphite", value: "#334155" },
] as const;

export const DEFAULT_FORM_THEME = "#3f51f5";

export function isValidHexColor(value?: string | null): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function getFormThemeColor(value?: string | null): string {
  return isValidHexColor(value) ? value : DEFAULT_FORM_THEME;
}

/** Warna teks yang aman di atas warna aksen pilihan user. */
export function readableTextColor(hex: string): string {
  if (!isValidHexColor(hex)) return "#ffffff";

  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) =>
    parseInt(value.slice(index, index + 2), 16) / 255,
  );
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4),
  );
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "#0f100e" : "#ffffff";
}
