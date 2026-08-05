export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
      <div className="mx-auto max-w-7xl text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Tracko. Seluruh hak dilindungi.
      </div>
    </footer>
  );
}
