import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ClipboardList size={22} />
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-900">
              TrackoDev
            </h1>

            <p className="-mt-1 text-xs text-slate-500">
              Form Center
            </p>
          </div>
        </Link>

        {/* Menu */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
          >
            Home
          </Link>

          <a
            href="#forms"
            className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
          >
            Forms
          </a>
        </nav>

        {/* Action */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
          >
            Login
          </Link>
        </div>

      </div>
    </header>
  );
}