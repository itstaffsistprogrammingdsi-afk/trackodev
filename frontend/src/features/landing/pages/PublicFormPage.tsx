import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicFormBySlug } from "../api/landing.api"; // Sesuaikan path jika berbeda
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { FormDetail } from "../types";

export default function PublicFormPage() {
  // 🔥 1. Tangkap parameter slug dari URL
  const { slug } = useParams<{ slug: string }>(); 
  
  // 🔥 2. Siapkan state (menggunakan any dulu sementara untuk melihat bentuk datanya)
  const [form, setForm] = useState<FormDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 3. Panggil API saat halaman dimuat
  useEffect(() => {
    const fetchFormDetail = async () => {
      if (!slug) return;
      
      try {
        setIsLoading(true);
        const data = await getPublicFormBySlug(slug);
        setForm(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Gagal memuat form");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormDetail();
  }, [slug]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow max-w-3xl mx-auto w-full px-4 py-10">
        {isLoading && (
          <div className="text-center py-20 text-gray-500 animate-pulse">
            Memuat form...
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
            {error}
          </div>
        )}

        {!isLoading && !error && form && (
          <div className="bg-white p-8 rounded-xl shadow-sm border">
            {/* Header Form */}
            <h1 className="text-3xl font-bold mb-2">{form.name}</h1>
            {form.description && (
              <p className="text-gray-600 mb-8 whitespace-pre-wrap border-b pb-6">
                {form.description}
              </p>
            )}

            {/* Tempat Render Input Fields Nanti */}
            <div className="bg-blue-50 p-6 rounded border border-blue-100 text-blue-700 text-center">
              <p className="font-semibold">Data form berhasil ditarik!</p>
              <p className="text-sm mt-2 text-blue-600">
                Silakan cek console.log untuk melihat data "fields" yang direturn backend, lalu kita petakan menjadi input HTML.
              </p>
            </div>
            
            {/* Hapus atau comment kode ini nanti setelah form selesai di-styling */}
            <pre className="mt-8 bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(form.fields, null, 2)}
            </pre>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}