import { Link } from 'react-router-dom';
import { FormItem } from '../types';

interface FormListProps {
  forms: FormItem[];
  isLoading: boolean;
  error: string | null;
}

export default function FormList({ forms, isLoading, error }: FormListProps) {
  return (
    <section className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header Bagian dengan Copywriting Modern */}
        <div className="mb-12 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Pusat Permintaan Layanan
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl">
            Butuh bantuan atau ingin mengajukan permintaan baru? 
            Silakan pilih kategori formulir di bawah ini agar kami dapat memproses kebutuhan Anda dengan cepat.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-40 bg-white rounded-xl shadow-sm animate-pulse border border-gray-100" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-200 text-center">
            {error}
          </div>
        )}

        {/* List Form */}
        {!isLoading && !error && (
          <div className="grid gap-6 md:grid-cols-3">
            {forms.length > 0 ? (
              forms.map((form) => (
                <Link 
                  key={form.id} 
                  to={`/public/forms/${form.slug}`} 
                  className="group relative flex flex-col p-6 bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-500 overflow-hidden"
                >
                  {/* Decorative element */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full transition-transform group-hover:scale-110" />
                  
                  <div className="relative z-10">
                    <div className="mb-4 inline-flex p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {/* Placeholder Ikon - Bisa diganti dengan Lucide React Icons */}
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {form.name}
                    </h3>
                    
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">
                      {form.description || 'Klik untuk memulai pengisian formulir permintaan layanan ini.'}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center text-sm font-semibold text-blue-600 group-hover:underline">
                    Isi Formulir →
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-3 py-10 text-center text-gray-500">
                Belum ada formulir yang aktif saat ini.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}