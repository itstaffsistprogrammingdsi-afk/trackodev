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
    return "Tidak dapat masuk. Coba lagi.";
  }

  if (!error.response) {
    return "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.";
  }

  const status = error.response.status;

  if (status === 429) {
    return "Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.";
  }

  if (status === 403) {
    return "Akun ini tidak dapat mengakses Tracko. Hubungi admin divisi Anda.";
  }

  if (status >= 500) {
    return "Server sedang bermasalah. Coba lagi beberapa saat lagi.";
  }

  if (status === 400 || status === 401 || status === 422) {
    return "Email atau password salah.";
  }

  return "Permintaan masuk belum dapat diproses. Coba lagi.";
}

export default function SignInForm({
  redirectTo,
  restingMascotState = "idle",
  onMascotStateChange,
  onMascotGazeChange,
}: SignInFormProps) {
  const navigate = useNavigate();
  const { setUser } = useAuth();

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
      nextErrors.email = "Email wajib diisi.";
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = "Format email belum benar.";
    }

    if (!password) {
      nextErrors.password = "Password wajib diisi.";
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
        Masuk ke Tracko
      </h1>
      <p className="mt-2 text-sm leading-6 text-fg-muted">
        Gunakan akun yang terdaftar untuk membuka workspace Anda.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <AuthField
          id="login-email"
          label="Email"
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
          placeholder="nama@perusahaan.com"
          icon={<Mail />}
          error={fieldErrors.email}
        />

        <AuthField
          id="login-password"
          label="Password"
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
          placeholder="Masukkan password"
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
            Ingat email saya
          </label>

          <Link
            to="/forgot-password"
            className="inline-flex min-h-8 items-center rounded-[4px] text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Lupa password?
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
              Berhasil masuk
            </>
          ) : loading ? (
            <>
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
              />
              Memeriksa akun
            </>
          ) : (
            <>
              Masuk
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
