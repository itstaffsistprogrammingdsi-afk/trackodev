import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import LineChartOne from "../../components/charts/line/LineChartOne";
import PageMeta from "../../components/common/PageMeta";
import { useLanguage } from "@/context/LanguageContext";

export default function LineChart() {
  const { t } = useLanguage();
  return (
    <>
      <PageMeta
        title={t("Dasbor Grafik React.js | TailAdmin - Template Dasbor Admin React.js", "React.js Chart Dashboard | TailAdmin - React.js Admin Dashboard Template")}
        description={t("Ini adalah halaman Grafik React.js untuk TailAdmin - Template Dasbor Admin Tailwind CSS React.js", "This is React.js Chart Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template")}
      />
      <PageBreadcrumb pageTitle={t("Grafik garis", "Line chart")} />
      <div className="space-y-6">
        <ComponentCard title={t("Grafik garis 1", "Line chart 1")}>
          <LineChartOne />
        </ComponentCard>
      </div>
    </>
  );
}
