import {
  Infinity as InfinityIcon,
  ShieldCheck,
  Workflow,
  Users,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Background Blur */}
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl"></div>
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl"></div>
      <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl"></div>

      <div className="mx-auto flex min-h-[90vh] max-w-7xl flex-col items-center justify-between gap-16 px-6 py-20 lg:flex-row">
        {/* LEFT */}
        <div className="max-w-xl animate-fade-up">

          {/* Feature */}
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-xl bg-white p-4 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-2 text-3xl">⚡</div>

              <h4 className="font-semibold">Fast Workflow</h4>

              <p className="mt-2 text-sm text-gray-500">
                Kelola pekerjaan lebih cepat.
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-2 text-3xl">🔒</div>

              <h4 className="font-semibold">Secure Platform</h4>

              <p className="mt-2 text-sm text-gray-500">
                Hak akses berdasarkan role.
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-2 text-3xl">👥</div>

              <h4 className="font-semibold">Team Collaboration</h4>

              <p className="mt-2 text-sm text-gray-500">
                Kolaborasi tanpa hambatan.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="relative w-full max-w-2xl animate-float">
          {/* Dashboard */}
          <div className="rounded-3xl border border-white/50 bg-white/90 p-6 shadow-2xl backdrop-blur">
            {/* Top */}
            <div className="mb-6 flex items-center justify-between">
              <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-600">
                Online
              </div>
            </div>

            {/* Stats */}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <FeatureCard
                icon={<Workflow size={30} />}
                title="Workflow"
                color="text-blue-600"
              />

              <FeatureCard
                icon={<ShieldCheck size={30} />}
                title="Secure"
                color="text-green-600"
              />

              <FeatureCard
                icon={<Users size={30} />}
                title="Collaboration"
                color="text-orange-500"
              />

              <FeatureCard
                icon={<InfinityIcon size={30} />}
                title="Unlimited"
                color="text-indigo-600"
              />
            </div>

            {/* Fake Chart */}
            <div className="mt-8 rounded-2xl bg-gray-50 p-6">
              <div className="mb-5 flex justify-between">
                <h4 className="font-semibold">Productivity</h4>

                <span className="text-sm text-gray-400">This Week</span>
              </div>

              <div className="flex h-40 items-end gap-3">
                {[40, 60, 35, 90, 55, 120, 95].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400 transition duration-500 hover:scale-105"
                    style={{
                      height: `${height}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Floating Cards */}
          <div className="absolute -right-10 top-10 animate-bounce rounded-2xl bg-white p-4 shadow-xl">
            ⚡ Fast
          </div>

          <div className="absolute right-24 -top-8 h-16 w-16 animate-pulse rounded-full bg-blue-500/20"></div>
        </div>
      </div>
    </section>
  );
}

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  color: string;
};

function FeatureCard({ icon, title, color }: FeatureCardProps) {
  return (
    <div className="group rounded-2xl bg-gray-50 p-5 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl">
      <div
        className={`mb-4 inline-flex rounded-xl bg-white p-3 shadow ${color}`}
      >
        {icon}
      </div>

      <h3 className="font-semibold text-gray-800">{title}</h3>
    </div>
  );
}
