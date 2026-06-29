import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import FormList from "../components/FormList";
import Footer from "../components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Hero />
      <FormList />
      <Footer />
    </div>
  );
}