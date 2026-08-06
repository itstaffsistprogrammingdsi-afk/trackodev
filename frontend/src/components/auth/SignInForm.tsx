import { useState } from "react";
import { Link, useNavigate } from "react-router";

import {
  ChevronLeftIcon,
  EyeCloseIcon,
  EyeIcon,
} from "../../icons";

import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";

import { login } from "../../lib/auth.service";
import { updateMobileApiUrl } from "../../lib/axios";
import { getMobileApiUrl, isAndroidApp } from "../../lib/mobileConfig";
import { useAuth } from "@/context/AuthContext";

export default function SignInForm() {
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const androidApp = isAndroidApp();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoginError("");
      setLoading(true);

      if (androidApp) {
        updateMobileApiUrl(getMobileApiUrl());
      }

      // 1. Panggil API login
      await login(email, password);

      // 2. Refresh context auth (load user dari localStorage)
      await loadUser();

      // 3. Ambil data user dari localStorage
      const userStr = localStorage.getItem("user");
      let role = "user"; // default

      if (userStr) {
        try {
          const user = JSON.parse(userStr);

          // Ambil role dari berbagai kemungkinan struktur
          if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
            // roles bisa array string atau array object
            if (typeof user.roles[0] === "string") {
              role = user.roles[0]; // langsung string
            } else if (user.roles[0]?.name) {
              role = user.roles[0].name;
            }
          } else if (user.role?.name) {
            role = user.role.name;
          } else if (user.role) {
            role = user.role;
          }
        } catch {
          // ignore
        }
      }

      // 4. Redirect berdasarkan role
      if (role === "super_admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/my-work", { replace: true });
      }
    } catch (err: unknown) {
      console.error("LOGIN ERROR:", err);
      const message =
        err instanceof Error && /network|fetch|connect/i.test(err.message)
          ? "Server tidak dapat dijangkau. Periksa alamat server dan jaringan."
          : "Email atau password salah.";
      setLoginError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-md pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition hover:text-gray-700"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5">
            <h1 className="mb-2 font-semibold text-title-sm">Masuk ke Tracko</h1>
            <p className="text-sm text-gray-500">
              Gunakan akun Tracko Anda untuk melanjutkan.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="space-y-6">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="info@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox checked={isChecked} onChange={setIsChecked} />
                  <span className="text-sm">Keep me logged in</span>
                </div>
                <Link to="/reset-password" className="text-sm text-brand-500">
                  Forgot password?
                </Link>
              </div>

              <div>
                <Button
                  className="w-full"
                  size="sm"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Sedang masuk..." : "Masuk"}
                </Button>
              </div>

              {loginError && (
                <p
                  role="alert"
                  className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-950/40 dark:text-error-300"
                >
                  {loginError}
                </p>
              )}
            </div>
          </form>

          <div className="mt-5">
            <p className="text-center text-sm">
              Don’t have an account?{" "}
              <Link to="/signup" className="text-brand-500">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
