import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import axios from "axios";

import { login } from "../../lib/auth.service";
import { roleDestination } from "../../lib/authRedirect";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/i18n/translate";
import AuthField, {
  PasswordToggle,
  authPrimaryButtonClass,
} from "./AuthField";
import type { MascotGaze, MascotState } from "@/features/ai/JellyMascot";

const REMEMBERED_EMAIL_KEY = "tracko:remembered-email";

type FieldErrors = {
  email?: string;
  password?: string;
};

interface SignInFormProps {
  redirectTo?: string | null;
  restingMascotState?: MascotState;
  onMascotStateChange?: (state: MascotState) => void;
  onMascotGazeChange?: (gaze: MascotGaze) => void;
}

function readRememberedEmail(): string {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function loginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return translate("Tidak dapat masuk. Coba lagi.", "Unable to sign in. Try again.");
  }

  if (!error.response) {
    return translate(
      "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.",
      "Unable to reach the server. Check your connection and try again.",
    );
  }

  const status = error.response.status;

  if (status === 429) {
    return translate(
      "Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.",
      "Too many sign-in attempts. Wait a moment and try again.",
    );
  }

  if (status === 403) {
    return translate(
      "Akun ini tidak dapat mengakses Tracko. Hubungi admin divisi Anda.",
      "This account cannot access Tracko. Contact your division admin.",
    );
  }

  if (status >= 500) {
    return translate(
      "Server sedang bermasalah. Coba lagi beberapa saat lagi.",
      "The server is having issues. Try again in a moment.",
    );
  }

  if (status === 400 || status === 401 || status === 422) {
    return translate("Email atau password salah.", "Incorrect email or password.");
  }

  return translate(
    "Permintaan masuk belum dapat diproses. Coba lagi.",
    "The sign-in request could not be processed. Try again.",
  );
}

export default function SignInForm({
  redirectTo,
  restingMascotState = "idle",
  onMascotStateChange,
  onMascotGazeChange,
}: SignInFormProps) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState(readRememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(
    () => readRememberedEmail() !== "",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const submittingRef = useRef(false);
  const focusedFieldRef = useRef<"email" | "password" | null>(null);
  const initialFocusRef = useRef(true);
  const mascotResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (mascotResetTimer.current) clearTimeout(mascotResetTimer.current);
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  function setMascotState(state: MascotState) {
    onMascotStateChange?.(state);
  }

  function scheduleMascotReset() {
    if (mascotResetTimer.current) clearTimeout(mascotResetTimer.current);

    mascotResetTimer.current = setTimeout(() => {
      setMascotState(
        focusedFieldRef.current ? "greeting" : restingMascotState,
      );
    }, 2600);
  }

  function handleFieldFocus(field: "email" | "password") {
    focusedFieldRef.current = field;

    // Autofocus pertama tidak boleh menimpa ekspresi dasar tema
    // (terang: menyapa, gelap: santai).
    if (initialFocusRef.current) {
      initialFocusRef.current = false;
      return;
    }

    if (!loading) setMascotState("greeting");
  }

  function handleFieldBlur() {
    focusedFieldRef.current = null;
    if (!loading) setMascotState(restingMascotState);
  }

  function validateForm(): boolean {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = t("Email wajib diisi.", "Email is required.");
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = t("Format email belum benar.", "Email format is invalid.");
    }

    if (!password) {
      nextErrors.password = t("Password wajib diisi.", "Password is required.");
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function rememberEmailOnSuccess() {
    try {
      if (rememberEmail) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } catch {
      // localStorage dapat diblokir (mode privat); login tetap dilanjutkan.
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    setApiError(null);

    if (!validateForm()) {
      setMascotState("error");
      scheduleMascotReset();
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setMascotState("thinking");

    try {
      const { user } = await login(email.trim(), password);

      setUser(user);
      rememberEmailOnSuccess();
      setSucceeded(true);
      setMascotState("success");

      redirectTimer.current = setTimeout(() => {
        navigate(redirectTo || roleDestination(user), { replace: true });
      }, 900);
    } catch (error: unknown) {
      setApiError(loginErrorMessage(error));
      setMascotState("error");
      scheduleMascotReset();
      setLoading(false);
      submittingRef.current = false;
    }
  }

  function handlePasswordToggle() {
    const nextVisible = !showPassword;
    setShowPassword(nextVisible);
    onMascotGazeChange?.(nextVisible ? "left" : "center");
  }

  return (
    <div>
      <h1 className="text-[26px] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
        {t("Masuk ke Tracko", "Sign in to Tracko")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-fg-muted">
        {t(
          "Gunakan akun yang terdaftar untuk membuka workspace Anda.",
          "Use your registered account to open your workspace.",
        )}
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <AuthField
          id="login-email"
          label={t("Email")}
          type="email"
          autoComplete="username"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldErrors((current) => ({ ...current, email: undefined }));
            setApiError(null);
          }}
          onFocus={() => handleFieldFocus("email")}
          onBlur={handleFieldBlur}
          placeholder={t("nama@perusahaan.com", "name@company.com")}
          icon={<Mail />}
          error={fieldErrors.email}
        />

        <AuthField
          id="login-password"
          label={t("Password")}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
            setApiError(null);
          }}
          onFocus={() => handleFieldFocus("password")}
          onBlur={handleFieldBlur}
          placeholder={t("Masukkan password", "Enter your password")}
          icon={<LockKeyhole />}
          error={fieldErrors.password}
          trailing={
            <PasswordToggle
              visible={showPassword}
              onToggle={handlePasswordToggle}
            />
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="login-remember"
            className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-xs text-fg-muted"
          >
            <input
              id="login-remember"
              type="checkbox"
              checked={rememberEmail}
              onChange={(event) => setRememberEmail(event.target.checked)}
              className="h-4 w-4 rounded-[4px] border border-line accent-[var(--tracko-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            />
            {t("Ingat email saya", "Remember my email")}
          </label>

          <Link
            to="/forgot-password"
            className="inline-flex min-h-8 items-center rounded-[4px] text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {t("Lupa password?", "Forgot password?")}
          </Link>
        </div>

        {apiError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-control border border-danger/20 bg-danger-soft px-3 py-2.5 text-xs leading-5 text-danger"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={authPrimaryButtonClass}
        >
          {succeeded ? (
            <>
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              {t("Berhasil masuk", "Signed in")}
            </>
          ) : loading ? (
            <>
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
              />
              {t("Memeriksa akun", "Checking account")}
            </>
          ) : (
            <>
              {t("Masuk", "Sign in")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
