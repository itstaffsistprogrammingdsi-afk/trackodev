import { useRef, useState } from "react";
import { useUploadAvatar } from "../hooks/useAccount";

interface AvatarUploaderProps {
  name?: string;
  avatarUrl?: string;
}

const FALLBACK_AVATAR = "/images/user/owner.jpg";
const MAX_SIZE_MB = 2;

export default function AvatarUploader({
  name,
  avatarUrl,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useUploadAvatar();

  const handlePick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ukuran gambar maksimal ${MAX_SIZE_MB}MB.`);
      return;
    }

    setPreview(URL.createObjectURL(file));

    mutate(file, {
      onError: () => {
        setError("Gagal mengunggah foto profil. Coba lagi.");
        setPreview(null);
      },
    });

    // reset value biar bisa pilih file yang sama lagi kalau perlu re-upload
    e.target.value = "";
  };

  const displaySrc = preview || avatarUrl || FALLBACK_AVATAR;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-800">
        <img
          src={displaySrc}
          alt={name || "Avatar"}
          className="h-full w-full object-cover"
        />

        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={handlePick}
          disabled={isPending}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {isPending ? "Mengunggah..." : "Ganti Foto"}
        </button>

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          JPG, PNG, atau GIF. Maks {MAX_SIZE_MB}MB.
        </p>

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
