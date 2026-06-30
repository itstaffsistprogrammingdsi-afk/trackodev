import {
  Infinity as InfinityIcon,
  ShieldCheck,
  Workflow,
  Users,
  // PlayCircle,
  // ArrowRight
} from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-50 pt-10 pb-20 lg:pt-20 lg:pb-28">
      {/* Background Glows */}
      <div className="absolute -left-24 top-20 h-96 w-96 rounded-full bg-blue-400/20 blur-[100px]"></div>
      <div className="absolute right-0 top-0 h-[30rem] w-[30rem] rounded-full bg-indigo-400/10 blur-[100px]"></div>

      <div className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-between gap-16 px-6 lg:flex-row">
        
        {/* LEFT: Copywriting & CTAs */}
        <div className="max-w-xl animate-fade-up z-10 text-center lg:text-left mt-10 lg:mt-0">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
            Traco v1.0 is live
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-[4rem] xl:leading-[1.1]">
            Scale your team's <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              productivity.
            </span>
          </h1>
          
          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            Traco (task routing and activity coordination organizer) merupakan platform all-in-one untuk mengelola pekerjaan, kolaborasi tim, dan memonitor progress dengan mudah secara realtime.
          </p>

          {/* CTA Buttons */}
          {/* <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <button className="group flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 sm:w-auto">
              Start for free
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto">
              <PlayCircle size={20} className="text-slate-400" />
              Watch Demo
            </button>
          </div> */}

          {/* <p className="mt-5 text-sm text-slate-500">No credit card required • 14-day free trial</p> */}
        </div>

        {/* RIGHT: Dashboard Mockup */}
        <div className="relative w-full max-w-2xl animate-float z-10 hidden md:block">
          
          {/* Main Dashboard UI */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/50">
            {/* Window Header (macOS style) */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-400"></div>
              <div className="h-3 w-3 rounded-full bg-amber-400"></div>
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
            </div>

            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Project Overview</h3>
                  <p className="text-sm text-slate-500">Real-time metrics</p>
                </div>
                <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-600">
                  System Online
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <FeatureCard icon={<Workflow size={24} />} title="Workflow" color="text-blue-600" />
                <FeatureCard icon={<ShieldCheck size={24} />} title="Secure" color="text-emerald-600" />
                <FeatureCard icon={<Users size={24} />} title="Team" color="text-amber-500" />
                <FeatureCard icon={<InfinityIcon size={24} />} title="Scale" color="text-indigo-600" />
              </div>

              {/* Fake Chart */}
              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-6 flex items-center justify-between">
                  <h4 className="font-semibold text-slate-700">Productivity Analytics</h4>
                  <span className="text-xs font-medium text-slate-400">Last 7 Days</span>
                </div>

                <div className="flex h-32 items-end gap-3">
                  {[40, 60, 35, 90, 55, 120, 95].map((height, index) => (
                    <div
                      key={index}
                      className="group relative flex-1 rounded-t-md bg-gradient-to-t from-blue-500 to-cyan-300 transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${height}px` }}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {height}k
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating Accents */}
          <div className="absolute -right-8 top-20 animate-bounce rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">⚡</div>
              <div>
                <p className="text-xs text-slate-500">Performance</p>
                <p className="font-bold text-slate-800">99.9%</p>
              </div>
            </div>
          </div>
          <div className="absolute -left-8 bottom-20 animate-pulse rounded-full bg-blue-500/20 h-16 w-16 blur-xl"></div>
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
    <div className="group rounded-xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50">
      <div className={`mb-3 inline-flex rounded-lg bg-slate-50 p-2.5 shadow-sm ${color}`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
  );
}