import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ResponsiveImage from "../../components/ui/images/ResponsiveImage";
import TwoColumnImageGrid from "../../components/ui/images/TwoColumnImageGrid";
import ThreeColumnImageGrid from "../../components/ui/images/ThreeColumnImageGrid";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { useLanguage } from "@/context/LanguageContext";

export default function Images() {
  const { t } = useLanguage();
  return (
    <>
      <PageMeta
        title={t("Dasbor Gambar React.js | TailAdmin - Template Dasbor Admin React.js", "React.js Images Dashboard | TailAdmin - React.js Admin Dashboard Template")}
        description={t("Ini adalah halaman Gambar React.js untuk TailAdmin - Template Dasbor Admin Tailwind CSS React.js", "This is React.js Images page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template")}
      />
      <PageBreadcrumb pageTitle={t("Gambar", "Images")} />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title={t("Gambar responsif", "Responsive image")}>
          <ResponsiveImage />
        </ComponentCard>
        <ComponentCard title={t("Gambar dalam 2 kolom", "Image in 2-column grid")}>
          <TwoColumnImageGrid />
        </ComponentCard>
        <ComponentCard title={t("Gambar dalam 3 kolom", "Image in 3-column grid")}>
          <ThreeColumnImageGrid />
        </ComponentCard>
      </div>
    </>
  );
}
