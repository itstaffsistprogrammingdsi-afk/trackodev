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

const defaultTitles: Record<ToastVariant, string> = {
  success: "Berhasil",
  error: "Terjadi kesalahan",
  warning: "Perlu perhatian",
  info: "Informasi",
};

const inferVariant = (message: string): ToastVariant => {
  const normalized = message.toLowerCase();

  if (/(berhasil|success|tersimpan|disalin|dikirim)/.test(normalized)) {
    return "success";
  }

  if (/(peringatan|yakin|perlu perhatian)/.test(normalized)) {
    return "warning";
  }

  if (/(gagal|error|ditolak|unauthorized|tidak diizinkan|password|wajib)/.test(normalized)) {
    return "error";
  }

  return "info";
};

const inferTitle = (message: string, variant: ToastVariant): string => {
  const normalized = message.toLowerCase();

  if (/(akses|izin|unauthorized|forbidden|403)/.test(normalized)) {
    return "Akses ditolak";
  }

  if (/(password|email atau password|masuk)/.test(normalized)) {
    return "Gagal masuk";
  }

  return defaultTitles[variant];
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
    iconClass: "text-emerald-600 dark:text-emerald-300",
    iconBackground: "bg-emerald-50 dark:bg-emerald-500/15",
    border: "border-emerald-200/80 dark:border-emerald-500/25",
    progress: "bg-emerald-500",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-rose-600 dark:text-rose-300",
    iconBackground: "bg-rose-50 dark:bg-rose-500/15",
    border: "border-rose-200/80 dark:border-rose-500/25",
    progress: "bg-rose-500",
  },
  warning: {
    icon: TriangleAlert,
    iconClass: "text-amber-600 dark:text-amber-300",
    iconBackground: "bg-amber-50 dark:bg-amber-500/15",
    border: "border-amber-200/80 dark:border-amber-500/25",
    progress: "bg-amber-500",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-600 dark:text-blue-300",
    iconBackground: "bg-blue-50 dark:bg-blue-500/15",
    border: "border-blue-200/80 dark:border-blue-500/25",
    progress: "bg-blue-500",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
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
              className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl border bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-xl animate-in slide-in-from-right-4 fade-in duration-300 dark:bg-slate-900/95 ${style.border}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconBackground}`}
                >
                  <Icon size={19} className={style.iconClass} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {toast.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {toast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Tutup pemberitahuan"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <div
                className={`absolute inset-x-0 bottom-0 h-0.5 ${style.progress}`}
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
