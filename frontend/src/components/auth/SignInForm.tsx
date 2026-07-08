import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);

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
      alert("Email atau password salah");
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
            <h1 className="mb-2 font-semibold text-title-sm">Sign In</h1>
            <p className="text-sm text-gray-500">
              Enter your email and password to sign in!
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
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                  </span>
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
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
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