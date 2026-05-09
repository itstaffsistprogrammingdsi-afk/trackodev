import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import api from "../../lib/axios";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  // 🔥 state login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      // 🔥 simpan token
      localStorage.setItem("token", res.data.token);

      console.log("LOGIN SUCCESS:", res.data);

      // redirect
      window.location.href = "/";

    } catch (err: unknown) {
      console.error("LOGIN ERROR:", (err as { response?: { data: unknown } }).response?.data || err);
      alert("Email atau password salah");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5">
            <h1 className="mb-2 font-semibold text-title-sm">
              Sign In
            </h1>
            <p className="text-sm text-gray-500">
              Enter your email and password to sign in!
            </p>
          </div>

          {/* 🔥 FORM LOGIN */}
          <form onSubmit={handleLogin}>
            <div className="space-y-6">

              {/* EMAIL */}
              <div>
                <Label>Email *</Label>
                <Input
                  placeholder="info@gmail.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                />
              </div>

              {/* PASSWORD */}
              <div>
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                  </span>
                </div>
              </div>

              {/* REMEMBER */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox checked={isChecked} onChange={setIsChecked} />
                  <span className="text-sm">
                    Keep me logged in
                  </span>
                </div>

                <Link to="/reset-password" className="text-sm text-brand-500">
                  Forgot password?
                </Link>
              </div>

              {/* BUTTON */}
              <div>
                <Button className="w-full" size="sm" type="submit">
                  Sign in
                </Button>
              </div>

            </div>
          </form>

          {/* SIGNUP */}
          <div className="mt-5">
            <p className="text-sm text-center">
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