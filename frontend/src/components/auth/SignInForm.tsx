import { useState } from "react";
import { Link } from "react-router-dom";

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

import { useAuth } from "@/context/AuthContext";

export default function SignInForm() {
  // ============================================
  // AUTH
  // ============================================

  const { loadUser } = useAuth();

  // ============================================
  // STATES
  // ============================================

  const [showPassword, setShowPassword] =
    useState(false);

  const [isChecked, setIsChecked] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  // ============================================
  // LOGIN
  // ============================================

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setLoading(true);

      await login(email, password);

      // REFRESH AUTH CONTEXT

      await loadUser();

      // REDIRECT

      window.location.href = "/dashboard";

    } catch (err: unknown) {
      console.error(
        "LOGIN ERROR:",
        (
          err as {
            response?: {
              data?: unknown;
            };
          }
        ).response?.data || err
      );

      alert("Email atau password salah");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* TOP */}
      <div className="mx-auto w-full max-w-md pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition hover:text-gray-700"
        >
          <ChevronLeftIcon className="size-5" />

          Back to dashboard
        </Link>
      </div>

      {/* CONTENT */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          {/* HEADER */}
          <div className="mb-5">
            <h1 className="mb-2 font-semibold text-title-sm">
              Sign In
            </h1>

            <p className="text-sm text-gray-500">
              Enter your email and password
              to sign in!
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleLogin}>
            <div className="space-y-6">

              {/* EMAIL */}
              <div>
                <Label>Email *</Label>

                <Input
                  type="email"
                  placeholder="info@gmail.com"
                  value={email}
                  onChange={(
                    e: React.ChangeEvent<HTMLInputElement>
                  ) =>
                    setEmail(e.target.value)
                  }
                />
              </div>

              {/* PASSWORD */}
              <div>
                <Label>Password *</Label>

                <div className="relative">
                  <Input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement>
                    ) =>
                      setPassword(
                        e.target.value
                      )
                    }
                  />

                  <span
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeIcon />
                    ) : (
                      <EyeCloseIcon />
                    )}
                  </span>
                </div>
              </div>

              {/* REMEMBER */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isChecked}
                    onChange={setIsChecked}
                  />

                  <span className="text-sm">
                    Keep me logged in
                  </span>
                </div>

                <Link
                  to="/reset-password"
                  className="text-sm text-brand-500"
                >
                  Forgot password?
                </Link>
              </div>

              {/* BUTTON */}
              <div>
                <Button
                  className="w-full"
                  size="sm"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </Button>
              </div>
            </div>
          </form>

          {/* SIGNUP */}
          <div className="mt-5">
            <p className="text-center text-sm">
              Don’t have an account?{" "}

              <Link
                to="/signup"
                className="text-brand-500"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}