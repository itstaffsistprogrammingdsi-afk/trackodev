import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/i18n/translate";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = Required<Pick<ToastInput, "message" | "variant">> & {
  id: string;
  title: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

export const GLOBAL_TOAST_EVENT = "tracko:toast";

export const emitToast = (toast: ToastInput): void => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ToastInput>(GLOBAL_TOAST_EVENT, { detail: toast }),
  );
};

const ToastContext = createContext<ToastContextValue | null>(null);

const defaultTitles: Record<ToastVariant, { id: string; en: string }> = {
  success: { id: "Berhasil", en: "Success" },
  error: { id: "Terjadi kesalahan", en: "Something went wrong" },
  warning: { id: "Perlu perhatian", en: "Needs attention" },
  info: { id: "Informasi", en: "Information" },
};

const translateTitle = (variant: ToastVariant): string =>
  translate(defaultTitles[variant].id, defaultTitles[variant].en);

const inferVariant = (message: string): ToastVariant => {
  const normalized = message.toLowerCase();

  if (
    /(berhasil|success|tersimpan|saved|disalin|copied|dikirim|sent)/.test(
      normalized,
    )
  ) {
    return "success";
  }

  if (/(peringatan|yakin|perlu perhatian|warning|are you sure)/.test(normalized)) {
    return "warning";
  }

  if (
    /(gagal|error|failed|ditolak|denied|unauthorized|forbidden|tidak diizinkan|password|wajib|required)/.test(
      normalized,
    )
  ) {
    return "error";
  }

  return "info";
};

const inferTitle = (message: string, variant: ToastVariant): string => {
  // Judul khusus hanya berlaku untuk varian error/warning. Sebelumnya pesan
  // sukses seperti "Level akses diperbarui." ikut berjudul "Akses ditolak"
  // hanya karena mengandung kata "akses".
  if (variant !== "error" && variant !== "warning") {
    return translateTitle(variant);
  }

  const normalized = message.toLowerCase();

  if (/(akses|izin|unauthorized|forbidden|403|access denied)/.test(normalized)) {
    return translate("Akses ditolak", "Access denied");
  }

  if (/(password|email atau password|masuk|sign in|login)/.test(normalized)) {
    return translate("Gagal masuk", "Sign-in failed");
  }

  return translateTitle(variant);
};

const variantStyles: Record<
  ToastVariant,
  {
    icon: typeof CheckCircle2;
    iconClass: string;
    iconBackground: string;
    border: string;
    progress: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-success",
    iconBackground: "bg-success-soft",
    border: "border-success/20",
    progress: "bg-success",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-danger",
    iconBackground: "bg-danger-soft",
    border: "border-danger/20",
    progress: "bg-danger",
  },
  warning: {
    icon: TriangleAlert,
    iconClass: "text-warning",
    iconBackground: "bg-warning-soft",
    border: "border-warning/20",
    progress: "bg-warning",
  },
  info: {
    icon: Info,
    iconClass: "text-info",
    iconBackground: "bg-info-soft",
    border: "border-info/20",
    progress: "bg-info",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const sequenceRef = useRef(0);
  const recentRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const message = input.message.trim();
      if (!message) return;

      const variant = input.variant ?? inferVariant(message);
      const title = input.title?.trim() || inferTitle(message, variant);
      const dedupeKey = `${variant}:${title}:${message}`;
      const now = Date.now();
      const previous = recentRef.current.get(dedupeKey);

      // Satu kegagalan kadang ditangani oleh interceptor dan component secara
      // bersamaan. Hindari dua popup yang sama dalam rentang singkat.
      if (previous && now - previous < 1200) return;
      recentRef.current.set(dedupeKey, now);

      const id = `${now}-${sequenceRef.current++}`;
      const durationMs = input.durationMs ?? 4500;

      setToasts((current) => [
        ...current.slice(-3),
        { id, title, message, variant },
      ]);

      if (durationMs > 0) {
        window.setTimeout(() => dismissToast(id), durationMs);
      }
    },
    [dismissToast],
  );

  useEffect(() => {
    const handleGlobalToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastInput>).detail;
      if (detail?.message) showToast(detail);
    };

    const nativeAlert = window.alert.bind(window);
    const handleAlert = (message?: string) => {
      const text = String(message ?? "");
      const variant = inferVariant(text);
      showToast({
        message: text,
        variant,
        title: inferTitle(text, variant),
      });
    };

    window.addEventListener(GLOBAL_TOAST_EVENT, handleGlobalToast);
    window.alert = handleAlert;

    return () => {
      window.removeEventListener(GLOBAL_TOAST_EVENT, handleGlobalToast);
      window.alert = nativeAlert;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[100000] flex flex-col items-end gap-3 sm:left-auto sm:right-5 sm:w-[min(420px,calc(100vw-2.5rem))]"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const style = variantStyles[toast.variant];
          const Icon = style.icon;

          return (
            <div
              key={toast.id}
              role="alert"
              style={{ animation: "ui-toast-in 180ms ease-out" }}
              className={`pointer-events-auto relative w-full overflow-hidden rounded-card border bg-surface/95 p-4 shadow-e3 backdrop-blur-sm ${style.border}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${style.iconBackground}`}
                >
                  <Icon size={19} className={style.iconClass} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-fg">
                    {toast.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-fg-muted">
                    {toast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  aria-label={t("Tutup pemberitahuan", "Dismiss notification")}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <div
                className={`absolute inset-x-0 bottom-0 h-0.5 opacity-70 ${style.progress}`}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
