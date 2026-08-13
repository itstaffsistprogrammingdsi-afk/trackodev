import { Link } from "react-router";

export default function Navbar() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 top-0 z-50 mx-auto max-w-6xl px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pt-4"
    >
      <div className="flex h-14 items-center justify-between rounded-2xl border border-white/70 bg-white/95 px-3 shadow-lg shadow-slate-200/60 backdrop-blur-md sm:h-16 sm:rounded-full sm:px-6">
        <Link
          to="/"
          aria-label="Tracko - halaman utama"
          className="flex min-w-0 items-center gap-2"
        >
          <img
            width={32}
            height={32}
            src="/images/logo/icon.svg"
            alt=""
            className="h-8 w-8 shrink-0"
          />
          <span className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Tracko
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <a
            href="#beranda"
            className="rounded-full bg-blue-50 px-3 py-1 text-blue-600"
          >
            Beranda
          </a>
          <a href="#formulir" className="transition hover:text-blue-600">
            Form Request
          </a>
          <a href="#download-apk" className="transition hover:text-blue-600">
            Download APK
          </a>
          <a
            href="https://wa.me/6288806798349"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-blue-600"
          >
            Kontak
          </a>
        </div>

        <Link
          to="/signin"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-4 text-sm font-semibold text-white shadow-md transition hover:shadow-lg active:scale-[0.98] sm:px-6"
        >
          Masuk
        </Link>
      </div>
    </nav>
  );
}
