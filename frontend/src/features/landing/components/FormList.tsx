import { Link } from "react-router-dom";

import type { FormItem } from "../types";

interface FormListProps {
  forms: FormItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function FormList({
  forms,
  isLoading,
  error,
  onRetry,
}: FormListProps) {
  return (
    <section
      id="formulir"
      className="scroll-mt-24 bg-slate-50 py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-9 text-center sm:mb-12 md:text-left">
          <h2 className="mb-3 text-2xl font-extrabold leading-tight text-gray-900 sm:mb-4 sm:text-3xl md:text-4xl">
            Pusat Permintaan Layanan
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-gray-600 sm:text-lg md:mx-0">
            Butuh bantuan atau ingin mengajukan permintaan baru?{" "}
            Silakan pilih kategori formulir di bawah ini agar kami dapat
            memproses kebutuhan Anda dengan cepat.
          </p>
        </div>

        {isLoading ? (
          <div
            aria-label="Memuat formulir"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
          >
            {[1, 2, 3].map((number) => (
              <div
                key={number}
                className="h-44 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm"
              />
            ))}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-red-700 sm:p-6"
          >
            <p className="font-medium">Formulir belum dapat dimuat.</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 min-h-11 rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.98]"
            >
              Coba lagi
            </button>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {forms.length > 0 ? (
              forms.map((form) => (
                <Link
                  key={form.id}
                  to={`/public/forms/${form.slug}`}
                  className="group relative flex min-h-52 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl active:scale-[0.99] sm:p-6"
                >
                  <div
                    aria-hidden="true"
                    className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-blue-50 transition-transform group-hover:scale-110"
                  />

                  <div className="relative z-10">
                    <div className="mb-4 inline-flex rounded-lg bg-blue-50 p-3 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      <svg
                        aria-hidden="true"
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-gray-900 transition-colors group-hover:text-blue-600">
                      {form.name}
                    </h3>

                    <p className="line-clamp-3 text-sm leading-relaxed text-gray-500">
                      {form.description ||
                        "Klik untuk memulai pengisian formulir permintaan layanan ini."}
                    </p>
                  </div>

                  <div className="mt-auto pt-6 text-sm font-semibold text-blue-600 group-hover:underline">
                    Isi formulir <span aria-hidden="true">→</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-10 text-center text-gray-500 sm:col-span-2 lg:col-span-3">
                Belum ada formulir yang aktif saat ini.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
