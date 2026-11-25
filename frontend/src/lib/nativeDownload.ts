import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const sanitizeFileName = (value: string, fallback: string): string => {
  const cleaned = value.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || fallback;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });

/**
 * Menyimpan blob di web, atau membuka share sheet di Android/iOS.
 *
 * WebView Android tidak menangani anchor download untuk blob:, dan iOS tidak
 * menyimpan file dari blob URL. Di native, file ditulis ke cache lalu dibagikan
 * agar pengguna bisa menyimpan ke Files/Drive atau membukanya dengan aplikasi
 * PDF/Excel.
 */
export async function saveBlobFile(
  blob: Blob,
  fileName: string,
  fallbackName = "tracko-download",
): Promise<"downloaded" | "shared"> {
  const safeName = sanitizeFileName(fileName, fallbackName);

  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  }

  const base64 = await blobToBase64(blob);
  const path = `tracko-downloads/${Date.now()}-${safeName}`;

  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path,
    directory: Directory.Cache,
  });

  await Share.share({
    title: safeName,
    dialogTitle: safeName,
    files: [uri],
  });

  return "shared";
}
