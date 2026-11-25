import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Alert from "../../components/ui/alert/Alert";
import PageMeta from "../../components/common/PageMeta";
import { useLanguage } from "@/context/LanguageContext";

export default function Alerts() {
  const { t } = useLanguage();
  return (
    <>
      <PageMeta
        title={t("Dasbor Peringatan React.js | TailAdmin - Template Dasbor Admin React.js", "React.js Alerts Dashboard | TailAdmin - React.js Admin Dashboard Template")}
        description={t("Ini adalah halaman Dasbor Peringatan React.js untuk TailAdmin - Template Dasbor Admin Tailwind CSS React.js", "This is React.js Alerts Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template")}
      />
      <PageBreadcrumb pageTitle={t("Peringatan", "Alerts")} />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title={t("Peringatan berhasil", "Success alert")}>
          <Alert
            variant="success"
            title={t("Pesan berhasil", "Success message")}
            message={t("Berhati-hatilah saat melakukan tindakan ini.", "Be cautious when performing this action.")}
            showLink={true}
            linkHref="/"
            linkText={t("Pelajari lebih lanjut", "Learn more")}
          />
          <Alert
            variant="success"
            title={t("Pesan berhasil", "Success message")}
            message={t("Berhati-hatilah saat melakukan tindakan ini.", "Be cautious when performing this action.")}
            showLink={false}
          />
        </ComponentCard>
        <ComponentCard title={t("Peringatan", "Warning alert")}>
          <Alert
            variant="warning"
            title={t("Pesan peringatan", "Warning message")}
            message={t("Berhati-hatilah saat melakukan tindakan ini.", "Be cautious when performing this action.")}
            showLink={true}
            linkHref="/"
            linkText={t("Pelajari lebih lanjut", "Learn more")}
          />
          <Alert
            variant="warning"
            title={t("Pesan peringatan", "Warning message")}
            message={t("Berhati-hatilah saat melakukan tindakan ini.", "Be cautious when performing this action.")}
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title={t("Peringatan kesalahan", "Error alert")}>
          <Alert
            variant="error"
            title={t("Pesan kesalahan", "Error message")}
            message={t("Berhati-hatilah saat melakukan tindakan ini.", "Be cautious when performing this action.")}
            showLink={true}
            linkHref="/"
            linkText={t("Pelajari lebih lanjut", "Learn more")}
          />
          <Alert
            variant="error"
            title={t("Pesan kesalahan", "Error message")}
            message={t("Berhati-hatilah saat melakukan tindakan ini.", "Be cautious when performing this action.")}
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title={t("Peringatan info", "Info alert")}>
          <Alert
            variant="info"
            title={t("Pesan info", "Info message")}
            message={t("Berhati-hatilah saat melakukan tindakan ini.", "Be cautious when performing this action.")}
            showLink={true}
            linkHref="/"
            linkText={t("Pelajari lebih lanjut", "Learn more")}
          />
          <Alert
            variant="info"
            title={t("Pesan info", "Info message")}
            message={t("Berhati-hatilah saat melakukan tindakan ini.", "Be cautious when performing this action.")}
            showLink={false}
          />
        </ComponentCard>
      </div>
    </>
  );
}
