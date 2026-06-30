import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import FormList from "../components/FormList";
import Footer from "../components/Footer";
import { useLanding } from "../hooks/useLanding"; // 🔥 Perbaikan: Import hook yang sudah dibuat

export default function LandingPage() {
  // 🔥 Perbaikan: Panggil hook di sini agar variabelnya tersedia
  const { forms, isLoading, error } = useLanding(); 

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Hero />
      <FormList forms={forms} isLoading={isLoading} error={error}/>
      <Footer />
    </div>
  );
}