import Footer from "../components/Footer";
import DownloadApp from "../components/DownloadApp";
import FormList from "../components/FormList";
import Hero from "../components/Hero";
import Navbar from "../components/Navbar";
import { useLanding } from "../hooks/useLanding";

export default function LandingPage() {
  const { forms, isLoading, error, reload } = useLanding();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <DownloadApp />
        <FormList
          forms={forms}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
        />
      </main>
      <Footer />
    </div>
  );
}
