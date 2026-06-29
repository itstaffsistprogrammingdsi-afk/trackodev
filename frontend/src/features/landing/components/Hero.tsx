import { Link } from "react-router-dom";

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

          <h1 className="text-5xl font-black leading-tight text-gray-900 lg:text-7xl">
            One Platform.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Endless Possibilities.
            </span>
          </h1>

          {/* <p className="mt-8 text-lg leading-8 text-gray-600">
            TrackoDev membantu perusahaan mengelola pekerjaan,
            form digital, campaign, report, approval, dan
            kolaborasi tim dalam satu platform yang cepat,
            modern, dan mudah digunakan.
          </p> */}


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

              <h4 className="font-semibold">
                Secure Platform
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                Hak akses berdasarkan role.
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-2 text-3xl">👥</div>

              <h4 className="font-semibold">
                Team Collaboration
              </h4>

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
              <div>
                <h3 className="text-xl font-bold">
                  TrackoDev Dashboard
                </h3>

                <p className="text-sm text-gray-500">
                  Workflow Monitoring
                </p>
              </div>

              <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-600">
                Online
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                title="Requests"
                value="1,248"
                color="text-blue-600"
              />

              <StatCard
                title="In Progress"
                value="320"
                color="text-orange-500"
              />

              <StatCard
                title="Completed"
                value="928"
                color="text-green-600"
              />

              <StatCard
                title="Response"
                value="2.4h"
                color="text-indigo-600"
              />
            </div>

            {/* Fake Chart */}
            <div className="mt-8 rounded-2xl bg-gray-50 p-6">
              <div className="mb-5 flex justify-between">
                <h4 className="font-semibold">
                  Productivity
                </h4>

                <span className="text-sm text-gray-400">
                  This Week
                </span>
              </div>

              <div className="flex h-40 items-end gap-3">
                {[40, 60, 35, 90, 55, 120, 95].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400 transition duration-500 hover:scale-105"
                      style={{
                        height: `${height}px`,
                      }}
                    />
                  )
                )}
              </div>
            </div>
          </div>

          {/* Floating Cards */}
          <div className="absolute -left-10 top-10 animate-bounce rounded-2xl bg-white p-4 shadow-xl">
            ⚡ Fast
          </div>

          <div
            className="absolute -right-8 bottom-12 rounded-2xl bg-white p-4 shadow-xl"
            style={{
              animation:
                "float 5s ease-in-out infinite",
            }}
          >
            ✅ Approved
          </div>

          <div className="absolute right-24 -top-8 h-16 w-16 animate-pulse rounded-full bg-blue-500/20"></div>
        </div>
      </div>
    </section>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  color: string;
};

function StatCard({
  title,
  value,
  color,
}: StatCardProps) {
  return (
    <div className="rounded-2xl bg-gray-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <h3 className={`mt-2 text-3xl font-bold ${color}`}>
        {value}
      </h3>
    </div>
  );
}