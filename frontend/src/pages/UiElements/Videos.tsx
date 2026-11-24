import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import FourIsToThree from "../../components/ui/videos/FourIsToThree";
import OneIsToOne from "../../components/ui/videos/OneIsToOne";
import SixteenIsToNine from "../../components/ui/videos/SixteenIsToNine";
import TwentyOneIsToNine from "../../components/ui/videos/TwentyOneIsToNine";
import { useLanguage } from "@/context/LanguageContext";

export default function Videos() {
  const { t } = useLanguage();
  return (
    <>
      <PageMeta
        title={t("Tab Video React.js | TailAdmin - Template Dasbor Admin React.js", "React.js Videos Tabs | TailAdmin - React.js Admin Dashboard Template")}
        description={t("Ini adalah halaman Video React.js untuk TailAdmin - Template Dasbor Admin Tailwind CSS React.js", "This is React.js Videos page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template")}
      />
      <PageBreadcrumb pageTitle={t("Video", "Videos")} />
      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-2">
        <div className="space-y-5 sm:space-y-6">
          <ComponentCard title={t("Rasio Video 16:9", "Video ratio 16:9")}>
            <SixteenIsToNine />
          </ComponentCard>
          <ComponentCard title={t("Rasio Video 4:3", "Video ratio 4:3")}>
            <FourIsToThree />
          </ComponentCard>
        </div>
        <div className="space-y-5 sm:space-y-6">
          <ComponentCard title={t("Rasio Video 21:9", "Video ratio 21:9")}>
            <TwentyOneIsToNine />
          </ComponentCard>
          <ComponentCard title={t("Rasio Video 1:1", "Video ratio 1:1")}>
            <OneIsToOne />
          </ComponentCard>
        </div>
      </div>
    </>
  );
}
