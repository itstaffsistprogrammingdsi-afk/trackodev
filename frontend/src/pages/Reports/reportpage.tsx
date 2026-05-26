// import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
// import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
// import StatisticsChart from "../../components/ecommerce/StatisticsChart";
// import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
// import RecentOrders from "../../components/ecommerce/RecentOrders";
// import DemographicCard from "../../components/ecommerce/DemographicCard";
// import PageMeta from "../../components/common/PageMeta";


// export default function Home() {
//   return (
//     <>
//       <PageMeta
//         title="React.js Ecommerce Dashboard | TailAdmin - React.js Admin Dashboard Template"
//         description="This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
//       />
//       <div className="grid grid-cols-12 gap-4 md:gap-6">
//         <div className="col-span-12 space-y-6 xl:col-span-7">
//           <EcommerceMetrics />

//           <MonthlySalesChart />
//         </div>

//         <div className="col-span-12 xl:col-span-5">
//           <MonthlyTarget />
//         </div>

//         <div className="col-span-12">
//           <StatisticsChart />
//         </div>

//         <div className="col-span-12 xl:col-span-5">
//           <DemographicCard />
//         </div>

//         <div className="col-span-12 xl:col-span-7">
//           <RecentOrders />
//         </div>
//       </div>
//     </>
//   );
// }

import { Construction, Clock, RefreshCcw } from "lucide-react";

export default function InDevelopmentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-md border">
        
        {/* ICON */}
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-yellow-100">
            <Construction className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-2xl font-bold text-gray-800">
          Halaman Sedang Dalam Pengembangan
        </h1>

        {/* DESCRIPTION */}
        <p className="text-gray-500 mt-3">
          Fitur ini masih dalam tahap development. Kami sedang bekerja keras
          untuk menyempurnakannya agar segera bisa digunakan.
        </p>

        {/* STATUS */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Coming Soon</span>
        </div>

        {/* ACTION */}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>

        {/* FOOTNOTE */}
        <p className="text-xs text-gray-400 mt-6">
          Terima kasih atas kesabaran Anda 🙏
        </p>
      </div>
    </div>
  );
}