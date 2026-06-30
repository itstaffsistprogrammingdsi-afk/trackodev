import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    // 🔥 Wrapper untuk efek floating
    <nav className="fixed top-4 left-0 right-0 z-50 mx-auto max-w-6xl px-4">
      <div className="flex h-16 items-center justify-between rounded-full border border-gray-100 bg-white/90 px-6 shadow-lg backdrop-blur-md">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img width={32} height={32} src="/images/logo/icon.svg" alt="Logo" />
          <div className="flex flex-col leading-none mt-2">
            <span className="text-xl font-bold tracking-tight text-slate-900">Traco</span>
          </div>
        </Link>

        {/* Navigation Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link to="/" className="text-emerald-500 px-3 py-1 bg-emerald-50 rounded-full">Home</Link>
          <Link to="/" className="hover:text-emerald-500 transition">Form Request</Link>
          {/* <Link to="/services" className="hover:text-emerald-500 transition">Services</Link>
          <Link to="/blog" className="hover:text-emerald-500 transition">Blog</Link>
          <Link to="#" className="hover:text-emerald-500 transition flex items-center gap-1">
            Pages <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </Link> */}
          <Link to="https://wa.me/088806798349" className="hover:text-emerald-500 transition">Contact</Link>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <Link
            to="/signin"
            className="rounded-full bg-gradient-to-r from-blue-400 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}