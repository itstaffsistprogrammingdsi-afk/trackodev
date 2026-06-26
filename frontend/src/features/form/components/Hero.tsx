import { ArrowDown, ClipboardList } from "lucide-react";

export default function Hero() {
  const scrollToForms = () => {
    const section = document.getElementById("forms");

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600">

      {/* Background Blur */}
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center">

        {/* Icon */}

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
          <ClipboardList
            size={42}
            className="text-white"
          />
        </div>

        {/* Title */}

        <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
          Welcome to
          <br />
          TrackoDev Form Center
        </h1>

        {/* Subtitle */}

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-blue-100">
          Find, complete, and submit forms quickly.
          Everything is organized in one place with an
          easy-to-use experience.
        </p>

        {/* Button */}

        <button
          onClick={scrollToForms}
          className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          Browse Forms

          <ArrowDown size={18} />
        </button>

      </div>
    </section>
  );
}