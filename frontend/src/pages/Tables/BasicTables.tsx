import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import BasicTableOne from "../../components/tables/BasicTables/BasicTableOne";
import { useLanguage } from "@/context/LanguageContext";

export default function BasicTables() {
  const { t } = useLanguage();
  return (
    <>
      <PageMeta
        title={t("Dasbor Tabel Dasar React.js | TailAdmin - Template Dasbor Admin Next.js", "React.js Basic Tables Dashboard | TailAdmin - Next.js Admin Dashboard Template")}
        description={t("Ini adalah halaman Dasbor Tabel Dasar React.js untuk TailAdmin - Template Dasbor Admin Tailwind CSS React.js", "This is React.js Basic Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template")}
      />
      <PageBreadcrumb pageTitle={t("Tabel dasar", "Basic tables")} />
      <div className="space-y-6">
        <ComponentCard title={t("Tabel dasar 1", "Basic table 1")}>
          <BasicTableOne />
        </ComponentCard>
      </div>
    </>
  );
}
